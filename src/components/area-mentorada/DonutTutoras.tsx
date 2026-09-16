'use client';

import { useState } from 'react';
import type { CorDaFatia, Fatia } from './fatias';

const COR: Record<CorDaFatia, string> = {
  1: 'var(--serie-1)',
  2: 'var(--serie-2)',
  3: 'var(--serie-3)',
  4: 'var(--serie-4)',
  5: 'var(--serie-5)',
  extra: 'var(--serie-extra)',
};

const RAIO = 52;
const VOLTA = 2 * Math.PI * RAIO;
/** Folga entre fatias, no comprimento do arco. Some quando há uma fatia só. */
const FOLGA = 2.5;

/**
 * Rosca das sessões de um status, dividida por tutora.
 *
 * A legenda embaixo carrega nome, quantidade e percentual em texto — a cor
 * nunca é a única pista. Passar o mouse (ou o foco) numa fatia ou num item da
 * legenda destaca a tutora e troca o número do centro.
 */
export function DonutTutoras({ rotulo, fatias }: { rotulo: string; fatias: Fatia[] }) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const total = fatias.reduce((s, f) => s + f.total, 0);
  const destaque = fatias.find((f) => f.tutora === ativa);

  let inicio = 0;
  const arcos = fatias.map((f) => {
    const comprimento = (f.total / (total || 1)) * VOLTA;
    const arco = { ...f, inicio, comprimento };
    inicio += comprimento;
    return arco;
  });
  const folga = fatias.length > 1 ? FOLGA : 0;
  const pct = (n: number) => `${Math.round((n / (total || 1)) * 100)}%`;

  return (
    <figure className="flex flex-col items-center gap-3">
      <figcaption className="inline-flex items-center rounded-full bg-fundo px-3 py-1 text-xs text-texto-suave">
        {rotulo}
      </figcaption>

      <div className="relative size-40" onMouseLeave={() => setAtiva(null)}>
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
          <circle cx="64" cy="64" r={RAIO} fill="none" stroke="var(--superficie-2)" strokeWidth="12" />
          {arcos.map((a) => (
            <g key={a.tutora}>
              <circle
                cx="64"
                cy="64"
                r={RAIO}
                fill="none"
                stroke={COR[a.cor]}
                strokeWidth="12"
                strokeDasharray={`${Math.max(a.comprimento - folga, 0.5)} ${VOLTA}`}
                strokeDashoffset={-a.inicio}
                className="transition-opacity duration-200"
                style={{ opacity: ativa && ativa !== a.tutora ? 0.3 : 1 }}
              />
              {/* Alvo do mouse mais largo que a fatia visível. */}
              <circle
                cx="64"
                cy="64"
                r={RAIO}
                fill="none"
                stroke="transparent"
                strokeWidth="22"
                strokeDasharray={`${a.comprimento} ${VOLTA}`}
                strokeDashoffset={-a.inicio}
                onMouseEnter={() => setAtiva(a.tutora)}
                style={{ pointerEvents: 'stroke' }}
              />
            </g>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {total === 0 ? (
            <span className="text-xs text-texto-suave">Sem dados</span>
          ) : destaque ? (
            <>
              <span className="display text-4xl leading-none">{destaque.total}</span>
              <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-texto-suave">{destaque.tutora}</span>
            </>
          ) : (
            <>
              <span className="display text-4xl leading-none">{total}</span>
              <span className="mt-1 text-xs text-texto-suave">{total === 1 ? 'sessão' : 'sessões'}</span>
            </>
          )}
        </div>
      </div>

      {fatias.length > 0 ? (
        <ul className="flex max-w-xs flex-wrap justify-center gap-x-4 gap-y-1.5">
          {fatias.map((f) => (
            <li
              key={f.tutora}
              tabIndex={0}
              onMouseEnter={() => setAtiva(f.tutora)}
              onMouseLeave={() => setAtiva(null)}
              onFocus={() => setAtiva(f.tutora)}
              onBlur={() => setAtiva(null)}
              className="flex cursor-default items-center gap-1.5 rounded text-xs outline-none focus-visible:ring-2 focus-visible:ring-marca/30"
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: COR[f.cor] }} />
              <span className="text-texto">{f.tutora}</span>
              <span className="text-texto-suave tabular-nums">
                {f.total} ({pct(f.total)})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
