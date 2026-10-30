'use client';

import { useState } from 'react';
import type { ItemPlanejamento } from '@/lib/notion/mentorada';
import { Etiqueta } from './Etiqueta';

const COLUNAS = [
  { nome: 'Status', largura: 'w-32' },
  { nome: 'Objetivo', largura: '' },
  { nome: 'Trimestre', largura: 'w-28' },
  { nome: 'Pilar', largura: 'w-28' },
  { nome: 'Tutoria', largura: 'w-44' },
];

export function TabelaObjetivos({ objetivos }: { objetivos: ItemPlanejamento[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
      <table className="w-full min-w-[44rem] table-fixed text-[14px]">
        <thead>
          <tr className="border-b border-borda text-left">
            {COLUNAS.map((c) => (
              <th
                key={c.nome}
                className={`rotulo px-4 py-2 text-[11px] font-normal whitespace-nowrap text-texto-suave ${c.largura}`}
              >
                {c.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objetivos.map((item) => (
            <tr
              key={item.id}
              className="border-b border-borda/60 transition last:border-0 hover:bg-fundo"
            >
              <td className="px-4 py-2 whitespace-nowrap">
                <Etiqueta texto={item.status} />
              </td>
              <td className="truncate px-4 py-2 tracking-[0.005em]" title={item.objetivo}>
                {item.objetivo}
              </td>
              <td className="truncate px-4 py-2 whitespace-nowrap text-texto-suave">
                {item.trimestre}
              </td>
              <td className="truncate px-4 py-2 whitespace-nowrap text-texto-suave">
                {item.pilar}
              </td>
              <td
                className="truncate px-4 py-2 whitespace-nowrap text-texto-suave"
                title={item.tutoria}
              >
                {item.tutoria}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Objetivos com um botão por ano: entra no ano corrente e troca num clique.
 *
 * A ordem dos botões segue a da casa: o ano atual primeiro, os outros em ordem
 * decrescente, e "Sem ano" por último.
 */
export function ObjetivosPorAno({ objetivos }: { objetivos: ItemPlanejamento[] }) {
  const anoAtual = String(new Date().getFullYear());

  const porAno = new Map<string, ItemPlanejamento[]>();
  for (const o of objetivos) {
    const ano = o.ano?.trim() || SEM_ANO;
    porAno.set(ano, [...(porAno.get(ano) ?? []), o]);
  }

  const anos = [...porAno.keys()].sort((a, b) => {
    if (a === anoAtual) return -1;
    if (b === anoAtual) return 1;
    if (a === SEM_ANO) return 1;
    if (b === SEM_ANO) return -1;
    return b.localeCompare(a);
  });

  const [escolhido, setEscolhido] = useState(anos[0]);
  // O ano pode mudar quando a lista chega do Notion depois de um recarregamento.
  const ano = anos.includes(escolhido) ? escolhido : anos[0];

  if (anos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
        Nenhum objetivo cadastrado.
      </p>
    );
  }

  return (
    <div>
      {anos.length > 1 ? (
        <div role="tablist" aria-label="Filtrar objetivos por ano" className="mb-3 flex flex-wrap gap-1">
          {anos.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={a === ano}
              onClick={() => setEscolhido(a)}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                a === ano ? 'bg-marca font-medium text-marca-contraste' : 'text-texto-suave hover:bg-fundo hover:text-texto'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      ) : null}

      <TabelaObjetivos objetivos={porAno.get(ano) ?? []} />
    </div>
  );
}

const SEM_ANO = 'Sem ano';
