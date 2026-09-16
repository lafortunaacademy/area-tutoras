'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Tag, User } from 'lucide-react';
import { salvarValorDoMes } from '@/app/mentoradas/actions';
import type { CampoEditavelDoMes } from '@/lib/notion/gestao';
import { TabelaFinanceira, type Coluna } from './TabelaFinanceira';

export type LinhaMensal = {
  id: string;
  /** "Jan", "Fev"… — o ano já aparece acima da tabela. */
  mes: string;
  /** Nome completo do mês no Notion, para rótulos de acessibilidade. */
  mesCompleto: string;
  editaveis: Record<CampoEditavelDoMes, number | null>;
  /** Fórmulas do Notion: só leitura. `percentual` é fração (0,25 = 25%). */
  calculados: { lucroSem: number | null; lucroCom: number | null; percentual: number | null };
};

export type GrupoMensal = { categoria: string; linhas: LinhaMensal[] };

const COLUNAS: Coluna[] = [
  { nome: 'Mês' },
  { nome: 'Faturamento', numero: true },
  { nome: 'Resgate', numero: true },
  { nome: 'Despesas', numero: true },
  { nome: 'Investimento', numero: true },
  { nome: 'Lucro s/ invest.', numero: true, destaque: true },
  { nome: 'Lucro c/ invest.', numero: true, destaque: true },
  { nome: '% Lucro', numero: true, destaque: true },
];

const NOMES: Record<CampoEditavelDoMes, string> = {
  faturamento: 'Faturamento',
  resgate: 'Resgate',
  despesas: 'Despesas',
  investimento: 'Investimento',
  caixa: 'Caixa do mês',
};

const ICONES: Record<string, typeof Briefcase> = { negócio: Briefcase, pessoal: User };

const NUMERO = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Número sem "R$" (o aviso acima da tabela já diz a moeda). */
const numero = (n: number) => NUMERO.format(n);

const soma = (valores: (number | null)[]) => {
  const cheios = valores.filter((v): v is number => v !== null);
  return cheios.length ? cheios.reduce((a, b) => a + b, 0) : null;
};

/**
 * A visão mês a mês, com negócio e pessoal em abas, como no Notion.
 *
 * Faturamento, resgate, despesas e investimento se editam clicando no
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
      rotulo={`${NOMES[campo]} de ${l.mesCompleto}`}
    />
  );

  const linhas = atual.linhas;
  const total = (campo: CampoEditavelDoMes) => soma(linhas.map((l) => l.editaveis[campo]));
  const faturamentoTotal = total('faturamento');
  const lucroComTotal = soma(linhas.map((l) => l.calculados.lucroCom));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {grupos.length > 1 ? (
          <div role="tablist" aria-label="Categoria" className="flex gap-1">
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
        ) : (
          <span />
        )}
        <p className="text-[11px] text-texto-suave">Valores em R$ · clique num valor para editar</p>
      </div>

      <TabelaFinanceira
        colunas={COLUNAS}
        linhas={linhas.map((l) => ({
          id: l.id,
          celulas: [
            <span key="mes" className="font-medium">
              {l.mes}
            </span>,
            celula(l, 'faturamento'),
            celula(l, 'resgate'),
            celula(l, 'despesas'),
            celula(l, 'investimento'),
            <Calculado key="ls" valor={l.calculados.lucroSem} lucro />,
            <Calculado key="lc" valor={l.calculados.lucroCom} lucro forte />,
            <Calculado key="pc" valor={l.calculados.percentual} lucro percentual />,
          ],
        }))}
        rodape={[
          'Total',
          <Calculado key="t1" valor={faturamentoTotal} />,
          <Calculado key="t2" valor={total('resgate')} />,
          <Calculado key="t3" valor={total('despesas')} />,
          <Calculado key="t4" valor={total('investimento')} />,
          <Calculado key="t5" valor={soma(linhas.map((l) => l.calculados.lucroSem))} lucro />,
          <Calculado key="t6" valor={lucroComTotal} lucro forte />,
          <Calculado
            key="t8"
            valor={faturamentoTotal && lucroComTotal !== null ? lucroComTotal / faturamentoTotal : null}
            lucro
            percentual
          />,
        ]}
      />
    </div>
  );
}

/** Célula só de leitura; lucro positivo em verde, negativo sem cor; vazio bem apagado. */
function Calculado({
  valor,
  percentual,
  forte,
  lucro,
}: {
  valor: number | null;
  percentual?: boolean;
  forte?: boolean;
  lucro?: boolean;
}) {
  if (valor === null || !Number.isFinite(valor)) return <Vazio />;
  const texto = percentual
    ? `${(valor * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    : numero(valor);
  return <span className={`${lucro && valor > 0 ? 'text-ok' : ''} ${forte ? 'font-medium' : ''}`}>{texto}</span>;
}

function Vazio() {
  return <span className="text-borda">—</span>;
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
        className="w-28 rounded-md border border-marca bg-superficie px-1.5 py-0.5 text-right text-[13px] text-texto tabular-nums outline-none ring-2 ring-marca/20"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      title={erro ?? `Editar ${rotulo}`}
      aria-label={`Editar ${rotulo}`}
      className={`-mx-1.5 min-w-16 rounded-md px-1.5 py-0.5 text-right tabular-nums transition hover:bg-marca-suave ${
        erro ? 'text-parado' : ''
      } ${salvando ? 'opacity-60' : ''}`}
    >
      {erro ? '⚠ ' : ''}
      {mostrado === null ? <Vazio /> : numero(mostrado)}
    </button>
  );
}
