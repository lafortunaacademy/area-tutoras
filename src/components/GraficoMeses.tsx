'use client';

import { useState } from 'react';
import type { MesDeSessoes } from '@/lib/notion/tutora';

/**
 * Um mês por barra, do começo até agora.
 *
 * Série única, então não há legenda — o título da seção já diz o que é. O eixo é
 * um só de propósito: reais e volume andam juntos mas têm escalas diferentes, e
 * empilhar os dois num gráfico só mentiria sobre a proporção. São dois gráficos.
 */
export function GraficoMeses({
  meses,
  tipo,
}: {
  /** Do mais antigo para o mais recente. */
  meses: MesDeSessoes[];
  tipo: 'reais' | 'volume';
}) {
  const [sobre, setSobre] = useState<number | null>(null);

  if (meses.length === 0) return null;

  const valorDe = (m: MesDeSessoes) => (tipo === 'reais' ? (m.valor ?? 0) : m.sessoes);
  const rotuloDe = (m: MesDeSessoes) =>
    tipo === 'reais' ? (m.valorEmReais ?? '—') : String(m.sessoes);

  const maximo = Math.max(...meses.map(valorDe), 1);
  const ultimo = meses.length - 1;
  const maior = meses.findIndex((m) => valorDe(m) === Math.max(...meses.map(valorDe)));

  return (
    <figure className="rounded-xl border border-borda bg-superficie p-6">
      {/* `items-stretch` é o que faz a altura em % das barras ter referência:
          cada coluna ocupa a altura toda e a barra cresce dentro dela. */}
      <div
        className="relative flex h-44 items-stretch gap-1.5"
        onMouseLeave={() => setSobre(null)}
      >
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-b border-borda" />

        {meses.map((m, i) => {
          const v = valorDe(m);
          const altura = (v / maximo) * 100;
          const destaque = i === ultimo || i === maior;

          return (
            <div
              key={m.chave}
              className="group relative flex min-w-0 flex-1 flex-col justify-end"
              onMouseEnter={() => setSobre(i)}
              onFocus={() => setSobre(i)}
              onBlur={() => setSobre(null)}
              tabIndex={0}
            >
              {destaque && v > 0 ? (
                <span className="mb-1 truncate text-center text-[10px] tabular-nums text-texto-suave">
                  {tipo === 'reais' ? compacto(v) : v}
                </span>
              ) : null}

              <div
                className="rounded-t-[4px] bg-marca transition-opacity group-hover:opacity-75"
                style={{ height: `${v > 0 ? Math.max(altura, 2) : 0}%` }}
              />

              {sobre === i ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-borda bg-superficie px-3 py-2 text-xs shadow-[var(--sombra)]">
                  <p className="font-medium">{m.rotulo}</p>
                  <p className="mt-0.5 text-texto-suave">{rotuloDe(m)}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1.5">
        {meses.map((m) => (
          <span
            key={m.chave}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave"
            title={m.rotulo}
          >
            {curto(m.chave)}
          </span>
        ))}
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>{tipo === 'reais' ? 'Recebido por mês' : 'Tutorias por mês'}</caption>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave}>
                <td>{m.rotulo}</td>
                <td>{rotuloDe(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** "2026-01" -> "jan/26": o nome inteiro não cabe quando são doze colunas. */
function curto(chave: string): string {
  const [ano, mes] = chave.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[Number(mes) - 1] ?? mes}/${ano.slice(2)}`;
}

/** R$ 3.150 vira "3,1 mil" — em cima da barra só cabe a ordem de grandeza. */
function compacto(valor: number): string {
  if (valor < 1000) return `R$ ${valor}`;
  const mil = valor / 1000;
  return `${mil.toFixed(mil < 10 ? 1 : 0).replace('.', ',')} mil`;
}
