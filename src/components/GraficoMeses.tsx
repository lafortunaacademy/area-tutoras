'use client';

import { useState } from 'react';
import type { FatiaDeMentoria, MesDeSessoes } from '@/lib/notion/tutora';

/**
 * Um mês por barra, do começo até agora.
 *
 * Série única, então não há legenda — o título já diz o que é. Escala própria por
 * gráfico: reais e volume andam juntos mas têm ordens de grandeza diferentes, e
 * um eixo só mentiria sobre a proporção do outro.
 *
 * Sem grade e sem eixo: o valor de cada mês fica escrito em cima da própria
 * barra, que é o que se quer ler. Sobra só a linha do zero, como apoio.
 */
export function GraficoMeses({
  meses,
  tipo,
  mentorias,
}: {
  /** Do mais antigo para o mais recente. */
  meses: MesDeSessoes[];
  tipo: 'reais' | 'volume';
  /** As mentorias na ordem das cores; com uma só, a legenda não aparece. */
  mentorias: string[];
}) {
  const [sobre, setSobre] = useState<number | null>(null);

  if (meses.length === 0) return null;

  const valorDe = (m: MesDeSessoes) => (tipo === 'reais' ? (m.valor ?? 0) : m.sessoes);
  const rotuloCheio = (m: MesDeSessoes) =>
    tipo === 'reais' ? (m.valorEmReais ?? '') : `${m.sessoes} ${m.sessoes === 1 ? 'tutoria' : 'tutorias'}`;

  /** O número em cima da barra: em reais, com o R$ e os milhares separados. */
  const rotuloCurto = (m: MesDeSessoes) => {
    const v = valorDe(m);
    if (!v) return '';
    return tipo === 'reais' ? formatarReais(v) : String(v);
  };

  const valorDaFatia = (f: FatiaDeMentoria) => (tipo === 'reais' ? (f.valor ?? 0) : f.sessoes);
  const corDa = (mentoria: string) => CORES[Math.max(mentorias.indexOf(mentoria), 0) % CORES.length];

  // No gráfico de valores, mentoria sem preço (as "Sem mentoria") não vira
  // fatia nenhuma: também não entra na legenda.
  const naLegenda = mentorias.filter((m) =>
    meses.some((mes) => mes.porMentoria.some((f) => f.mentoria === m && valorDaFatia(f) > 0)),
  );

  const pico = Math.max(...meses.map(valorDe), 1);
  const topo = arredondarParaCima(pico);
  const total = meses.reduce((s, m) => s + valorDe(m), 0);
  const ultimo = meses.length - 1;

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

      <div
        className="relative flex h-40 items-end gap-2 border-b border-borda"
        onMouseLeave={() => setSobre(null)}
      >
        {meses.map((m, i) => {
          const v = valorDe(m);
          // 12% reservados para o rótulo, que fica em cima da barra.
          const altura = (v / topo) * 88;
          const ativo = sobre === i;
          const apagado = sobre !== null && !ativo;

          return (
            <div
              key={m.chave}
              className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setSobre(i)}
              onFocus={() => setSobre(i)}
              onBlur={() => setSobre(null)}
              tabIndex={0}
            >
              <span
                className={`mb-1 text-[10px] whitespace-nowrap tabular-nums transition-opacity ${
                  apagado ? 'text-texto-suave opacity-40' : 'text-texto-suave'
                }`}
              >
                {rotuloCurto(m)}
              </span>
              <div
                className={`flex w-full max-w-7 flex-col-reverse justify-start overflow-hidden rounded-t-[4px] transition-all duration-300 ${
                  apagado ? 'opacity-40' : 'opacity-100'
                }`}
                style={{ height: `${v > 0 ? Math.max(altura, 1.5) : 0}%` }}
              >
                {m.porMentoria.map((f) => (
                  <div
                    key={f.mentoria}
                    // 2px de fundo entre as fatias: separa sem precisar de borda.
                    className="w-full shrink-0 border-t-2 border-superficie first:border-t-0"
                    style={{
                      height: `${v > 0 ? (valorDaFatia(f) / v) * 100 : 0}%`,
                      backgroundColor: corDa(f.mentoria),
                    }}
                  />
                ))}
              </div>

              {ativo ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-borda bg-superficie px-3 py-2 shadow-[var(--sombra)]">
                  <p className="text-[11px] text-texto-suave">{m.rotulo}</p>
                  <p className="mt-0.5 text-sm font-medium">{rotuloCheio(m)}</p>
                  {m.porMentoria.length > 1 ? (
                    <ul className="mt-1.5 space-y-0.5">
                      {m.porMentoria.map((f) => (
                        <li key={f.mentoria} className="flex items-center gap-1.5 text-[11px] text-texto-suave">
                          <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: corDa(f.mentoria) }} />
                          {f.mentoria}: {tipo === 'reais' ? (f.valorEmReais ?? '') : f.sessoes}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {meses.map((m, i) => (
          <span
            key={m.chave}
            className={`min-w-0 flex-1 truncate text-center text-[10px] tabular-nums transition-colors ${
              sobre === i || (sobre === null && i === ultimo) ? 'font-medium text-texto' : 'text-texto-suave'
            }`}
            title={m.rotulo}
          >
            {curto(m.chave)}
          </span>
        ))}
      </div>

      {naLegenda.length > 1 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {naLegenda.map((m) => (
            <li key={m} className="flex items-center gap-1.5 text-[11px] text-texto-suave">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: corDa(m) }} />
              {m}
            </li>
          ))}
        </ul>
      ) : null}

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

/**
 * Uma cor por mentoria, na ordem fixa de `mentoriasDe`: o marrom da marca, o
 * taupe de apoio e o bege. São tons da própria marca, distinguíveis também em
 * preto e branco por causa da diferença de claridade.
 */
const CORES = ['var(--marca)', 'var(--destaque)', 'var(--borda)', 'var(--texto-suave)'];

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

/** "R$3.500,00": como a La Fortuna escreve, sem espaço depois do R$. */
function formatarReais(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, '');
}

