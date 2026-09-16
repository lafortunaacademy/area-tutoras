import type { LucideIcon } from 'lucide-react';
import { percentual, reais } from '@/lib/formato';
import { Bloco, SemDados } from './Bloco';
import type { Ponto } from './GraficoBarras';
import { COR_DO_TOM, escala, rotuloCurto } from './escala';

/**
 * Linha com área em degradê, para a evolução mês a mês — como o gráfico de
 * faturamento mensal do Notion. Cada ponto traz o valor escrito acima.
 *
 * A linha e a área são SVG esticado no espaço do gráfico; pontos e textos são
 * HTML posicionado por porcentagem, para não deformarem junto.
 */
export function GraficoLinha({
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
  tom: 'verde' | 'azul';
  className?: string;
}) {
  const cor = COR_DO_TOM[tom];
  const { min, max, marcas } = escala(pontos.map((p) => p.valor));
  const faixa = max - min || 1;
  const y = (v: number) => 100 - ((v - min) / faixa) * 100;
  const x = (i: number) => (pontos.length === 1 ? 50 : ((i + 0.5) / pontos.length) * 100);

  // A linha liga só os meses preenchidos; mês vazio não vira zero.
  const cheios = pontos.map((p, i) => ({ i, v: p.valor })).filter((p): p is { i: number; v: number } => p.v !== null);
  const temDados = cheios.some((p) => p.v !== 0);
  const cheio = (v: number | null) => (formato === 'reais' ? reais(v) : percentual(v));
  const idGradiente = `area-${tom}-${titulo.replace(/\W+/g, '')}`;

  const linha = cheios.map((p) => `${x(p.i)},${y(p.v)}`).join(' ');
  const area =
    cheios.length > 1
      ? `${x(cheios[0].i)},${y(Math.max(min, 0))} ${linha} ${x(cheios.at(-1)!.i)},${y(Math.max(min, 0))}`
      : '';

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

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={idGradiente} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={cor} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={cor} stopOpacity="0" />
                </linearGradient>
              </defs>
              {area ? <polygon points={area} fill={`url(#${idGradiente})`} /> : null}
              {cheios.length > 1 ? (
                <polyline
                  points={linha}
                  fill="none"
                  stroke={cor}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </svg>

            {cheios.map((p) => (
              <div
                key={p.i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x(p.i)}%`, top: `${y(p.v)}%` }}
                title={`${pontos[p.i].rotulo}: ${cheio(p.v)}`}
              >
                <span className="block size-2 rounded-full border-2 border-superficie" style={{ background: cor }} />
                <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[9.5px] whitespace-nowrap text-texto-suave tabular-nums">
                  {rotuloCurto(p.v, formato)}
                </span>
              </div>
            ))}

            {!temDados ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <SemDados />
              </div>
            ) : null}
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

/** Valores do eixo à esquerda, alinhados às linhas da grade. */
export function Eixo({
  marcas,
  y,
  formato,
}: {
  marcas: number[];
  y: (v: number) => number;
  formato: 'reais' | 'percentual';
}) {
  return (
    <div aria-hidden className="relative mt-5 h-44 w-20 shrink-0">
      {marcas.map((m) => (
        <span
          key={m}
          className="absolute right-0 -translate-y-1/2 text-[9.5px] whitespace-nowrap text-texto-suave/80 tabular-nums"
          style={{ top: `${y(m)}%` }}
        >
          {rotuloCurto(m, formato)}
        </span>
      ))}
    </div>
  );
}

/** Linhas horizontais pontilhadas, bem discretas; a do zero um pouco mais marcada. */
export function Grade({ marcas, y }: { marcas: number[]; y: (v: number) => number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {marcas.map((m) => (
        <div
          key={m}
          className={`absolute inset-x-0 border-t ${m === 0 ? 'border-borda' : 'border-dashed border-borda/40'}`}
          style={{ top: `${y(m)}%` }}
        />
      ))}
    </div>
  );
}
