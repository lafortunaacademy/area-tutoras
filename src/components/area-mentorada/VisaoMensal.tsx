'use client';

import { useState } from 'react';
import { Briefcase, Tag, User } from 'lucide-react';
import { Etiqueta } from '@/components/Etiqueta';
import { TabelaFinanceira, type Coluna } from './TabelaFinanceira';

export type LinhaMensal = {
  id: string;
  mes: string;
  /** Já formatados, na ordem das colunas de Faturamento a % Lucro. */
  valores: string[];
};

export type GrupoMensal = {
  categoria: string;
  linhas: LinhaMensal[];
  /** Mesma ordem de `valores`; vazio onde não há soma. */
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

/** A visão mês a mês, com negócio e pessoal em abas, como no Notion. */
export function VisaoMensal({ grupos }: { grupos: GrupoMensal[] }) {
  const [aba, setAba] = useState(grupos[0]?.categoria ?? '');
  const atual = grupos.find((g) => g.categoria === aba) ?? grupos[0];

  if (!atual) {
    return (
      <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
        Nenhum mês cadastrado.
      </p>
    );
  }

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
            ...l.valores,
          ],
        }))}
        rodape={['Soma', '', ...atual.somas]}
      />
    </div>
  );
}
