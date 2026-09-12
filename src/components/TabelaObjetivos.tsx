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
      <table className="w-full min-w-[44rem] table-fixed text-[13px]">
        <thead>
          <tr className="border-b border-borda text-left">
            {COLUNAS.map((c) => (
              <th
                key={c.nome}
                className={`rotulo px-4 py-2 text-[10px] font-normal whitespace-nowrap text-texto-suave ${c.largura}`}
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
 * Objetivos agrupados por ano: o ano corrente aberto, os anteriores recolhidos.
 *
 * O que se faz agora é o que interessa; o histórico existe para consulta, não
 * para ocupar a tela. `<details>` abre sem depender de JavaScript.
 */
export function ObjetivosPorAno({ objetivos }: { objetivos: ItemPlanejamento[] }) {
  const anoAtual = String(new Date().getFullYear());

  const porAno = new Map<string, ItemPlanejamento[]>();
  for (const o of objetivos) {
    const ano = o.ano?.trim() || 'Sem ano';
    porAno.set(ano, [...(porAno.get(ano) ?? []), o]);
  }

  const doAtual = porAno.get(anoAtual) ?? [];
  const outros = [...porAno.entries()]
    .filter(([ano]) => ano !== anoAtual)
    // Anos decrescentes; "Sem ano" sempre por último.
    .sort((a, b) => (a[0] === 'Sem ano' ? 1 : b[0] === 'Sem ano' ? -1 : b[0].localeCompare(a[0])));

  return (
    <div className="space-y-3">
      {doAtual.length > 0 ? <TabelaObjetivos objetivos={doAtual} /> : null}

      {outros.map(([ano, lista]) => (
        <details key={ano} className="group rounded-xl border border-borda bg-superficie">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-texto-suave transition hover:text-texto">
            <span className="transition-transform group-open:rotate-90">›</span>
            <span className="font-medium">{ano}</span>
            <span className="text-xs text-destaque">
              {lista.length} {lista.length === 1 ? 'objetivo' : 'objetivos'}
            </span>
          </summary>
          <div className="border-t border-borda">
            <TabelaObjetivos objetivos={lista} />
          </div>
        </details>
      ))}

      {doAtual.length === 0 && outros.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
          Nenhum objetivo cadastrado.
        </p>
      ) : null}
    </div>
  );
}
