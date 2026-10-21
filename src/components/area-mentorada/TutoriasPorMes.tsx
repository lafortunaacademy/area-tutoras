'use client';

import { useState } from 'react';
import type { Fatia } from './fatias';

export type MesDeTutorias = { rotulo: string; porTutora: Fatia[] };

/**
 * Quantas tutorias foram realizadas em cada mês do ciclo, empilhadas por tutora
 * — o terceiro gráfico do progresso no Notion.
 *
 * Mesmas cores das roscas: a cor segue a tutora, então dá para olhar os três
 * gráficos juntos sem reaprender a legenda.
 */
export function TutoriasPorMes({ meses }: { meses: MesDeTutorias[] }) {
  const [sobre, setSobre] = useState<number | null>(null);

  const totais = meses.map((m) => m.porTutora.reduce((s, f) => s + f.total, 0));
  const pico = Math.max(...totais, 1);
  const total = totais.reduce((s, t) => s + t, 0);

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-texto-suave">Nenhuma tutoria realizada neste ciclo.</p>;
  }

  return (
    <div>
      <div className="flex h-40 items-end gap-2" onMouseLeave={() => setSobre(null)}>
        {meses.map((m, i) => {
          const soma = totais[i];
          const ativo = sobre === i;

          return (
            <div
              key={m.rotulo}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setSobre(i)}
              onFocus={() => setSobre(i)}
              onBlur={() => setSobre(null)}
              tabIndex={0}
            >
              <span className="mb-1 text-[10px] text-texto-suave tabular-nums">{soma || ''}</span>

              {/* 12% da altura ficam para o número em cima da barra. */}
              <div
                className={`flex w-full max-w-7 flex-col-reverse overflow-hidden rounded-t-[4px] transition-opacity ${
                  sobre !== null && !ativo ? 'opacity-40' : ''
                }`}
                style={{ height: `${soma ? Math.max((soma / pico) * 88, 2) : 0}%` }}
              >
                {m.porTutora.map((f) => (
                  <div
                    key={f.rotulo}
                    className="w-full shrink-0 border-t-2 border-superficie first:border-t-0"
                    style={{ height: `${(f.total / soma) * 100}%`, backgroundColor: f.cor }}
                  />
                ))}
              </div>

              {ativo && soma ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-borda bg-superficie px-3 py-2 shadow-[var(--sombra)]">
                  <p className="text-[11px] text-texto-suave">{m.rotulo}</p>
                  <ul className="mt-1 space-y-0.5">
                    {m.porTutora.map((f) => (
                      <li key={f.rotulo} className="flex items-center gap-1.5 text-[11px]">
                        <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: f.cor }} />
                        {f.rotulo}: {f.total}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {meses.map((m) => (
          <span key={m.rotulo} className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave">
            {m.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
