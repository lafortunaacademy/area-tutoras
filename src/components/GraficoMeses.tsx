'use client';

import { useState } from 'react';
import type { MesDeSessoes } from '@/lib/notion/tutora';

/**
 * Um mês por barra, do começo até agora.
 *
 * Série única, então não há legenda — o título já diz o que é. Escala própria por
 * gráfico: reais e volume andam juntos mas têm ordens de grandeza diferentes, e
 * um eixo só mentiria sobre a proporção do outro.
 *
 * O eixo é discreto de propósito: linhas de grade em tom de apoio, atrás das
 * barras. Quem lê quer comparar meses, não medir pixels.
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
  const rotuloCheio = (m: MesDeSessoes) =>
    tipo === 'reais' ? (m.valorEmReais ?? '—') : `${m.sessoes} ${m.sessoes === 1 ? 'tutoria' : 'tutorias'}`;

  const pico = Math.max(...meses.map(valorDe), 1);
  const topo = arredondarParaCima(pico);
  const total = meses.reduce((s, m) => s + valorDe(m), 0);
  const ultimo = meses.length - 1;

  const linhas = [1, 0.75, 0.5, 0.25, 0];

  return (
    <figure className="rounded-xl border border-borda bg-superficie p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="rotulo text-[10px] text-destaque">
            {tipo === 'reais' ? 'Total no período' : 'Tutorias no período'}
          </p>
          <p className="display mt-1 text-2xl leading-none">
            {tipo === 'reais' ? formatarReais(total) : total}
          </p>
        </div>
        <p className="text-xs text-texto-suave">
          {meses.length} {meses.length === 1 ? 'mês' : 'meses'}
        </p>
      </div>

      <div className="flex gap-3">
        {/* Eixo à esquerda: três marcas bastam para dar noção de grandeza. */}
        <div className="flex h-44 w-10 shrink-0 flex-col justify-between text-right">
          {linhas.slice(0, -1).map((f) => (
            <span key={f} className="text-[10px] leading-none text-destaque tabular-nums">
              {tipo === 'reais' ? compacto(topo * f) : Math.round(topo * f)}
            </span>
          ))}
          <span className="text-[10px] leading-none text-destaque">0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative flex h-44 items-stretch gap-1.5"
            onMouseLeave={() => setSobre(null)}
          >
            {/* Grade atrás das barras, sem competir com elas. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {linhas.map((f) => (
                <div
                  key={f}
                  className={f === 0 ? 'border-b border-borda' : 'border-b border-borda/45'}
                />
              ))}
            </div>

            {meses.map((m, i) => {
              const v = valorDe(m);
              const altura = (v / topo) * 100;
              const ativo = sobre === i;
              const apagado = sobre !== null && !ativo;

              return (
                <div
                  key={m.chave}
                  className="group relative flex min-w-0 flex-1 flex-col justify-end"
                  onMouseEnter={() => setSobre(i)}
                  onFocus={() => setSobre(i)}
                  onBlur={() => setSobre(null)}
                  tabIndex={0}
                >
                  <div
                    className={`rounded-t-[4px] transition-all duration-300 ${
                      i === ultimo ? 'bg-marca' : 'bg-marca/80'
                    } ${apagado ? 'opacity-35' : 'opacity-100'}`}
                    style={{ height: `${v > 0 ? Math.max(altura, 1.5) : 0}%` }}
                  />

                  {ativo ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-borda bg-superficie px-3 py-2 shadow-[var(--sombra)]">
                      <p className="text-[11px] text-texto-suave">{m.rotulo}</p>
                      <p className="mt-0.5 text-sm font-medium">{rotuloCheio(m)}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-1.5">
            {meses.map((m, i) => (
              <span
                key={m.chave}
                className={`min-w-0 flex-1 truncate text-center text-[10px] tabular-nums transition-colors ${
                  sobre === i || (sobre === null && i === ultimo)
                    ? 'font-medium text-texto'
                    : 'text-texto-suave'
                }`}
                title={m.rotulo}
              >
                {curto(m.chave)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        <table>
          <caption>{tipo === 'reais' ? 'Recebido por mês' : 'Tutorias por mês'}</caption>
          <tbody>
            {meses.map((m) => (
              <tr key={m.chave}>
                <td>{m.rotulo}</td>
                <td>{rotuloCheio(m)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Topo do eixo num número redondo, para as marcas não saírem quebradas. */
function arredondarParaCima(v: number): number {
  if (v <= 10) return Math.ceil(v);
  const ordem = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (ordem / 2)) * (ordem / 2);
}

/** "2026-01" -> "jan/26": o nome inteiro não cabe quando são doze colunas. */
function curto(chave: string): string {
  const [ano, mes] = chave.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[Number(mes) - 1] ?? mes}/${ano.slice(2)}`;
}

function formatarReais(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/** No eixo só cabe a ordem de grandeza: 3500 -> "3,5k". */
function compacto(v: number): string {
  if (v < 1000) return String(Math.round(v));
  const mil = v / 1000;
  return `${mil.toFixed(mil < 10 ? 1 : 0).replace('.', ',')}k`;
}
