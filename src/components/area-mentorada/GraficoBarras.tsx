import type { LucideIcon } from 'lucide-react';
import { percentual, reais, reaisCompacto } from '@/lib/formato';
import { Bloco, SemDados } from './Bloco';

export type Ponto = { rotulo: string; valor: number | null };

/**
 * Barras de uma série só — sem legenda, o título diz o que é.
 *
 * A linha do zero acompanha os dados: lucro pode ser negativo, e aí a barra
 * desce abaixo dela em vez de sumir. Com poucas barras (trimestres, anos) o
 * valor vai escrito em cima; com doze, só no `title`, senão os rótulos se
 * atropelam.
 */
export function GraficoBarras({
  icone,
  titulo,
  periodo,
  pontos,
  formato,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  periodo?: string;
  pontos: Ponto[];
  formato: 'reais' | 'percentual';
  className?: string;
}) {
  const valores = pontos.map((p) => p.valor ?? 0);
  const temDados = pontos.some((p) => p.valor !== null && p.valor !== 0);
  const maximo = Math.max(0, ...valores);
  const minimo = Math.min(0, ...valores);
  const faixa = maximo - minimo || 1;
  const zero = (-minimo / faixa) * 100;
  const poucas = pontos.length <= 4;

  const cheio = (v: number | null) => (formato === 'reais' ? reais(v) : percentual(v));
  const curto = (v: number) => (formato === 'reais' ? reaisCompacto(v) : percentual(v));

  return (
    <Bloco
      icone={icone}
      titulo={titulo}
      className={className}
      acao={periodo ? <span className="text-xs text-texto-suave">{periodo}</span> : undefined}
    >
      <div className={`relative h-40 ${poucas ? 'mt-4' : ''}`}>
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-borda/45" />
          ))}
        </div>
        <div aria-hidden className="absolute inset-x-0 border-b border-borda" style={{ bottom: `${zero}%` }} />

        <div aria-hidden className="absolute inset-0 flex gap-1.5">
          {pontos.map((p, i) => {
            const v = p.valor ?? 0;
            const altura = (Math.abs(v) / faixa) * 100;
            const base = v >= 0 ? zero : zero - altura;

            return (
              <div key={i} className="relative min-w-0 flex-1" title={`${p.rotulo}: ${cheio(p.valor)}`}>
                {v !== 0 ? (
                  <div
                    className={`absolute inset-x-[14%] ${
                      v > 0 ? 'rounded-t-[4px] bg-marca/85' : 'rounded-b-[4px] bg-parado/70'
                    }`}
                    style={{ bottom: `${base}%`, height: `${Math.max(altura, 1)}%` }}
                  />
                ) : null}
                {poucas && v !== 0 ? (
                  <span
                    className="absolute inset-x-0 text-center text-[10px] whitespace-nowrap text-texto-suave tabular-nums"
                    style={{ bottom: v > 0 ? `calc(${base + altura}% + 4px)` : `calc(${base}% - 16px)` }}
                  >
                    {curto(v)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {!temDados ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <SemDados />
          </div>
        ) : null}
      </div>

      <div aria-hidden className="mt-2 flex gap-1.5">
        {pontos.map((p, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave">
            {p.rotulo}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>
          {pontos.map((p, i) => (
            <tr key={i}>
              <td>{p.rotulo}</td>
              <td>{cheio(p.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Bloco>
  );
}
