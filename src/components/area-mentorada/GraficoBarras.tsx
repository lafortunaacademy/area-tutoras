import type { LucideIcon } from 'lucide-react';
import { percentual, reais } from '@/lib/formato';
import { Bloco, SemDados } from './Bloco';
import { COR_DO_TOM, escala, rotuloCurto } from './escala';
import { Eixo, Grade } from './GraficoLinha';

export type Ponto = { rotulo: string; valor: number | null };

/**
 * Barras finas com o valor escrito em cima e a escala à esquerda — como os
 * gráficos trimestral e anual do Notion. Lucro negativo desce abaixo do zero,
 * no mesmo tom, mais apagado.
 */
export function GraficoBarras({
  icone,
  titulo,
  periodo,
  pontos,
  formato,
  tom,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  periodo?: string;
  pontos: Ponto[];
  formato: 'reais' | 'percentual';
  /** Faturamento em verde, lucro em azul — tons leves, como os gráficos do Notion. */
  tom: 'verde' | 'azul';
  className?: string;
}) {
  const cor = COR_DO_TOM[tom];
  const { min, max, marcas } = escala(pontos.map((p) => p.valor));
  const faixa = max - min || 1;
  const y = (v: number) => 100 - ((v - min) / faixa) * 100;
  const zero = y(0);
  const temDados = pontos.some((p) => p.valor !== null && p.valor !== 0);
  const cheio = (v: number | null) => (formato === 'reais' ? reais(v) : percentual(v));

  return (
    <Bloco
      icone={icone}
      titulo={titulo}
      className={className}
      acao={periodo ? <span className="text-xs text-texto-suave">{periodo}</span> : undefined}
    >
      <div className="flex gap-2">
        <Eixo marcas={marcas} y={y} formato={formato} />

        <div className="min-w-0 flex-1">
          <div className="relative mt-5 h-44">
            <Grade marcas={marcas} y={y} />

            <div className="absolute inset-0 flex">
              {pontos.map((p, i) => {
                const v = p.valor ?? 0;
                const topo = y(Math.max(v, 0));
                const base = y(Math.min(v, 0));
                return (
                  <div key={i} className="relative min-w-0 flex-1" title={`${p.rotulo}: ${cheio(p.valor)}`}>
                    {v !== 0 ? (
                      <>
                        <div
                          className={`absolute left-1/2 w-3 -translate-x-1/2 ${v > 0 ? 'rounded-t-sm' : 'rounded-b-sm'}`}
                          style={{ top: `${topo}%`, height: `${Math.max(base - topo, 0.5)}%`, background: cor, opacity: v > 0 ? 1 : 0.55 }}
                        />
                        <span
                          className="absolute left-1/2 -translate-x-1/2 text-[9.5px] whitespace-nowrap text-texto-suave tabular-nums"
                          // Com mais de quatro barras os valores vizinhos se encostariam: alternam de altura.
                          style={
                            v > 0
                              ? { bottom: `calc(${100 - topo}% + ${4 + (pontos.length > 4 && i % 2 ? 13 : 0)}px)` }
                              : { top: `calc(${base}% + ${4 + (pontos.length > 4 && i % 2 ? 13 : 0)}px)` }
                          }
                        >
                          {rotuloCurto(v, formato)}
                        </span>
                      </>
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
            {/* Mantém a linha do zero à vista quando há negativos. */}
            {min < 0 ? <div aria-hidden className="absolute inset-x-0 border-t border-borda" style={{ top: `${zero}%` }} /> : null}
          </div>

          <div aria-hidden className="mt-2 flex">
            {pontos.map((p, i) => (
              <span key={i} className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave">
                {p.rotulo}
              </span>
            ))}
          </div>
        </div>
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
