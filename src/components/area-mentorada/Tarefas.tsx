'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Check, Plus } from 'lucide-react';
import { alternarTarefa } from '@/app/mentoradas/actions';

export type Tarefa = {
  id: string;
  tarefa: string;
  /** Já formatado ("20/09/2026"), ou vazio. */
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

/**
 * As tarefas da mentoria, separadas como no Notion: a fazer, feitas, todas.
 * Criar ou marcar como feita aqui grava na mesma base do Notion.
 */
export function Tarefas({ mentoradaId, tarefas }: { mentoradaId: string; tarefas: Tarefa[] }) {
  const [aba, setAba] = useState<Aba>('fazer');
  const atual = ABAS.find((a) => a.chave === aba)!;

  const visiveis = tarefas.filter((t) =>
    aba === 'todas' ? true : aba === 'feitas' ? t.feita : !t.feita,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filtrar tarefas" className="flex gap-1">
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

        <Link
          href={`/mentoradas/${mentoradaId}/tarefas/nova`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-marca-contraste transition hover:opacity-90"
        >
          <Plus aria-hidden size={14} />
          Adicionar tarefa
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full min-w-[36rem] table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {[
                ['Status', 'w-20'],
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
                  <td className="px-4 py-2">
                    <form action={alternarTarefa}>
                      <input type="hidden" name="mentoradaId" value={mentoradaId} />
                      <input type="hidden" name="tarefaId" value={t.id} />
                      <input type="hidden" name="feita" value={String(!t.feita)} />
                      <CaixaFeita feita={t.feita} tarefa={t.tarefa} />
                    </form>
                  </td>
                  <td
                    className={`truncate px-4 py-2.5 ${t.feita ? 'text-texto-suave line-through' : ''}`}
                    title={t.tarefa}
                  >
                    {t.tarefa}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">{t.prazo}</td>
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

function CaixaFeita({ feita, tarefa }: { feita: boolean; tarefa: string }) {
  const { pending } = useFormStatus();
  // Enquanto grava, a caixa já mostra o estado novo.
  const marcada = pending ? !feita : feita;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={feita ? `Desmarcar "${tarefa}"` : `Marcar "${tarefa}" como feita`}
      aria-pressed={marcada}
      className={`flex size-5 items-center justify-center rounded-md border transition ${
        marcada ? 'border-marca bg-marca text-marca-contraste' : 'border-borda bg-superficie hover:border-marca'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {marcada ? <Check aria-hidden size={13} strokeWidth={3} /> : null}
    </button>
  );
}
