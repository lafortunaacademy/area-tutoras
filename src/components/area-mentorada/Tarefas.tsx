'use client';

import { useState } from 'react';
import { Etiqueta } from '@/components/Etiqueta';

export type Tarefa = {
  id: string;
  tarefa: string;
  status: string;
  prazo: string;
  observacoes: string;
  feita: boolean;
};

const ABAS = [
  { chave: 'fazer', rotulo: 'A fazer', vazio: 'Nenhuma tarefa pendente.' },
  { chave: 'feitas', rotulo: 'Feitas', vazio: 'Nenhuma tarefa concluída ainda.' },
  { chave: 'todas', rotulo: 'Todas', vazio: 'Nenhuma tarefa ainda.' },
] as const;

type Aba = (typeof ABAS)[number]['chave'];

/** As tarefas da mentoria, separadas como no Notion: a fazer, feitas, todas. */
export function Tarefas({ tarefas }: { tarefas: Tarefa[] }) {
  const [aba, setAba] = useState<Aba>('fazer');
  const atual = ABAS.find((a) => a.chave === aba)!;

  const visiveis = tarefas.filter((t) =>
    aba === 'todas' ? true : aba === 'feitas' ? t.feita : !t.feita,
  );

  return (
    <div>
      <div role="tablist" aria-label="Filtrar tarefas" className="mb-3 flex gap-1">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              aba === a.chave
                ? 'bg-marca font-medium text-marca-contraste'
                : 'text-texto-suave hover:bg-fundo hover:text-texto'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full min-w-[36rem] table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {[
                ['Status', 'w-32'],
                ['Tarefa', ''],
                ['Prazo', 'w-28'],
                ['Observações', 'w-1/3'],
              ].map(([nome, largura]) => (
                <th
                  key={nome}
                  className={`rotulo px-4 py-2.5 text-[10px] font-normal whitespace-nowrap text-texto-suave ${largura}`}
                >
                  {nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-texto-suave">
                  {atual.vazio}
                </td>
              </tr>
            ) : (
              visiveis.map((t) => (
                <tr key={t.id} className="border-b border-borda last:border-0">
                  <td className="px-4 py-2.5">{t.status ? <Etiqueta texto={t.status} /> : null}</td>
                  <td className="truncate px-4 py-2.5" title={t.tarefa}>
                    {t.tarefa}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave">{t.prazo}</td>
                  <td className="truncate px-4 py-2.5 text-texto-suave" title={t.observacoes}>
                    {t.observacoes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
