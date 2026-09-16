import type { LucideIcon } from 'lucide-react';
import { Bloco, SemDados } from './Bloco';

/**
 * Moldura de um gráfico que ainda não tem de onde ler.
 *
 * Mostra o eixo do período e a grade, sem escala de valores: número inventado
 * num gráfico vazio parece dado. Quando a base existir, este componente dá lugar
 * ao gráfico de verdade no mesmo espaço.
 */
export function GraficoVazio({
  icone,
  titulo,
  eixo,
  periodo,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  eixo: string[];
  periodo?: string;
  className?: string;
}) {
  return (
    <Bloco
      icone={icone}
      titulo={titulo}
      className={className}
      acao={periodo ? <span className="text-xs text-texto-suave">{periodo}</span> : undefined}
    >
      <div className="relative h-40">
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={i === 4 ? 'border-b border-borda' : 'border-b border-borda/45'} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <SemDados />
        </div>
      </div>

      <div aria-hidden className="mt-2 flex gap-1.5">
        {eixo.map((e) => (
          <span key={e} className="min-w-0 flex-1 truncate text-center text-[10px] text-texto-suave">
            {e}
          </span>
        ))}
      </div>
    </Bloco>
  );
}
