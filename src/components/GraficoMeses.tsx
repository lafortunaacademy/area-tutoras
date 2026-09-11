'use client';

import { useState } from 'react';
import type { MesDeSessoes } from '@/lib/notion/tutora';

/**
 * Sessões por mês, do começo até agora.
 *
 * Série única, então não há legenda: o título já diz o que é. As barras são
 * contagem de sessões — o valor recebido é proporcional a elas e aparece no
 * hover, em vez de virar um segundo eixo, que mentiria sobre a escala.
 *
 * A tabela equivalente continua existindo para leitor de tela; ela é o que
 * torna o gráfico dispensável para quem não enxerga as barras.
 */
export function GraficoMeses({ meses }: { /** Do mais antigo para o mais recente. */ meses: MesDeSessoes[] }) {
  const [sobre, setSobre] = useState<number | null>(null);

  if (meses.length === 0) return null;

  const maximo = Math.max(...meses.map((m) => m.sessoes));
  const ultimo = meses.length - 1;
  const maior = meses.findIndex((m) => m.sessoes === maximo);

  return (
    <figure className="rounded-xl border border-borda bg-superficie p-6">
      <div className="relative flex h-48 items-end gap-2" onMouseLeave={() => setSobre(null)}>
        {/* Linha de base discreta: dá chão às barras sem competir com elas. */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-b border-borda" />

        {meses.map((m, i) => {
          const altura = maximo > 0 ? (m.sessoes / maximo) * 100 : 0;
          const rotula = i === ultimo || i === maior;

          return (
            <div
              key={m.chave}
              className="group relative flex min-w-0 flex-1 flex-col justify-end"
              onMouseEnter={() => setSobre(i)}
              onFocus={() => setSobre(i)}
              onBlur={() => setSobre(null)}
              tabIndex={0}
            >
              {rotula ? (
                <span className="mb-1 text-center text-xs tabular-nums text-texto-suave">
                  {m.sessoes}
                </span>
              ) : null}

              <div
                className="rounded-t-[4px] bg-marca transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(altura, m.sessoes > 0 ? 4 : 0)}%` }}
              />

              {sobre === i ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-borda bg-superficie px-3 py-2 text-xs shadow-[var(--sombra)]">
                  <p className="font-medium">{m.rotulo}</p>
                  <p className="mt-0.5 text-texto-suave">
                    {m.sessoes} {m.sessoes === 1 ? 'sessão' : 'sessões'}
                    {m.valorEmReais ? ` · ${m.valorEmReais}` : ''}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {meses.map((m) => (
          <span
            key={m.chave}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave"
            title={m.rotulo}
          >
            {m.rotulo.replace(' de ', '/').slice(0, 8)}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>Sessões por mês</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Sessões</th>
              <th>Recebido</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave}>
                <td>{m.rotulo}</td>
                <td>{m.sessoes}</td>
                <td>{m.valorEmReais ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
