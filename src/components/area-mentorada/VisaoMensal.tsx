'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Tag, User } from 'lucide-react';
import { Etiqueta } from '@/components/Etiqueta';
import { salvarValorDoMes } from '@/app/mentoradas/actions';
import type { CampoEditavelDoMes } from '@/lib/notion/gestao';
import { reais } from '@/lib/formato';
import { TabelaFinanceira, type Coluna } from './TabelaFinanceira';

export type LinhaMensal = {
  id: string;
  mes: string;
  /** Números crus dos campos que se digitam. */
  editaveis: Record<CampoEditavelDoMes, number | null>;
  /** Já formatados: lucro s/ investimento, lucro c/ investimento, % lucro. */
  calculados: { lucroSem: string; lucroCom: string; percentual: string };
};

export type GrupoMensal = {
  categoria: string;
  linhas: LinhaMensal[];
  /** Mesma ordem das colunas de Faturamento a % Lucro; vazio onde não há soma. */
  somas: string[];
};

const COLUNAS: Coluna[] = [
  { nome: 'Mês', largura: 'w-40' },
  { nome: 'Categoria', largura: 'w-28' },
  { nome: 'Faturamento', numero: true },
  { nome: 'Resgate', numero: true },
  { nome: 'Despesas', numero: true },
  { nome: 'Investimento', numero: true },
  { nome: 'Lucro s/ investimento', numero: true, largura: 'w-40' },
  { nome: 'Lucro c/ investimento', numero: true, largura: 'w-40' },
  { nome: 'Caixa do mês', numero: true },
  { nome: '% Lucro', numero: true, largura: 'w-20' },
];

const ICONES: Record<string, typeof Briefcase> = { negócio: Briefcase, pessoal: User };

/**
 * A visão mês a mês, com negócio e pessoal em abas, como no Notion.
 *
 * Faturamento, resgate, despesas, investimento e caixa se editam clicando no
 * valor; o que é gravado vai para o mesmo mês no Notion, e as colunas de lucro
 * (fórmulas de lá) voltam recalculadas.
 */
export function VisaoMensal({ mentoradaId, grupos }: { mentoradaId: string; grupos: GrupoMensal[] }) {
  const [aba, setAba] = useState(grupos[0]?.categoria ?? '');
  const atual = grupos.find((g) => g.categoria === aba) ?? grupos[0];

  if (!atual) {
    return (
      <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
        Nenhum mês cadastrado.
      </p>
    );
  }

  const celula = (l: LinhaMensal, campo: CampoEditavelDoMes) => (
    <CelulaValor
      key={campo}
      mentoradaId={mentoradaId}
      mesId={l.id}
      campo={campo}
      valor={l.editaveis[campo]}
      rotulo={`${COLUNAS.find((c) => c.nome.toLowerCase().startsWith(campo.slice(0, 5)))?.nome ?? campo} de ${l.mes}`}
    />
  );

  return (
    <div>
      {grupos.length > 1 ? (
        <div role="tablist" aria-label="Categoria" className="mb-3 flex gap-1">
          {grupos.map(({ categoria }) => {
            const Icone = ICONES[categoria.toLowerCase()] ?? Tag;
            return (
              <button
                key={categoria}
                type="button"
                role="tab"
                aria-selected={atual.categoria === categoria}
                onClick={() => setAba(categoria)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs capitalize transition ${
                  atual.categoria === categoria
                    ? 'bg-marca font-medium text-marca-contraste'
                    : 'text-texto-suave hover:bg-fundo hover:text-texto'
                }`}
              >
                <Icone aria-hidden size={13} />
                {categoria}
              </button>
            );
          })}
        </div>
      ) : null}

      <TabelaFinanceira
        minimo="64rem"
        colunas={COLUNAS}
        linhas={atual.linhas.map((l) => ({
          id: l.id,
          celulas: [
            <span key="mes" className="font-medium">
              {l.mes}
            </span>,
            atual.categoria ? <Etiqueta key="categoria" texto={atual.categoria} /> : '',
            celula(l, 'faturamento'),
            celula(l, 'resgate'),
            celula(l, 'despesas'),
            celula(l, 'investimento'),
            l.calculados.lucroSem,
            l.calculados.lucroCom,
            celula(l, 'caixa'),
            l.calculados.percentual,
          ],
        }))}
        rodape={['Soma', '', ...atual.somas]}
      />
      <p className="mt-2 px-1 text-[11px] text-texto-suave">
        Clique num valor para editar. Lucro e % são calculados.
      </p>
    </div>
  );
}

/** "1.234,56", "1234.56", "R$ 1.234" -> número; vazio -> null; lixo -> undefined. */
function lerNumero(texto: string): number | null | undefined {
  const limpo = texto.replace(/[^\d,.-]/g, '');
  if (!limpo) return null;
  const brasileiro = /,\d{1,2}$/.test(limpo) || (limpo.includes(',') && !limpo.includes('.'));
  const normal = brasileiro ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/,/g, '');
  const n = Number(normal);
  return Number.isFinite(n) ? n : undefined;
}

function CelulaValor({
  mentoradaId,
  mesId,
  campo,
  valor,
  rotulo,
}: {
  mentoradaId: string;
  mesId: string;
  campo: CampoEditavelDoMes;
  valor: number | null;
  rotulo: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [mostrado, setMostrado] = useState(valor);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const campoRef = useRef<HTMLInputElement>(null);

  // Quando a página recarrega com o valor do Notion, ele vence o que estava na tela.
  useEffect(() => setMostrado(valor), [valor]);
  useEffect(() => {
    if (editando) campoRef.current?.select();
  }, [editando]);

  const abrir = () => {
    setErro(null);
    setRascunho(mostrado === null ? '' : String(mostrado).replace('.', ','));
    setEditando(true);
  };

  const gravar = () => {
    const novo = lerNumero(rascunho);
    setEditando(false);
    if (novo === undefined) {
      setErro('Número inválido');
      return;
    }
    if (novo === mostrado) return;

    const anterior = mostrado;
    setMostrado(novo);
    iniciar(async () => {
      const r = await salvarValorDoMes(mentoradaId, mesId, campo, novo);
      if (!r.ok) {
        setMostrado(anterior);
        setErro(r.erro);
        return;
      }
      // Busca de novo: as fórmulas de lucro são recalculadas lá no Notion.
      router.refresh();
    });
  };

  if (editando) {
    return (
      <input
        ref={campoRef}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={gravar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') setEditando(false);
        }}
        inputMode="decimal"
        aria-label={rotulo}
        className="w-full rounded-md border border-marca bg-superficie px-1.5 py-0.5 text-right text-[13px] text-texto tabular-nums outline-none ring-2 ring-marca/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title={erro ?? `Editar ${rotulo}`}
      aria-label={`Editar ${rotulo}`}
      className={`-mx-1.5 w-[calc(100%+0.75rem)] rounded-md px-1.5 py-0.5 text-right tabular-nums transition hover:bg-marca-suave ${
        erro ? 'text-parado' : ''
      } ${salvando ? 'opacity-60' : ''}`}
    >
      {erro ? '⚠ ' : ''}
      {reais(mostrado)}
    </button>
  );
}
