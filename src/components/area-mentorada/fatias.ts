import type { TutoriasPorTutora } from '@/lib/notion/jornada';
import { SEM_TUTORA } from '@/lib/notion/config';

/** `cor` já é um valor de CSS pronto para usar no gráfico. */
export type Fatia = { tutora: string; total: number; cor: string };

/** Quantas cores fixas existem em globals.css (--serie-1 … --serie-9). */
const CORES_FIXAS = 9;

/**
 * Cor da tutora na posição `i` do ranking.
 *
 * As nove primeiras vêm da paleta pastel validada. Daí em diante são geradas:
 * o matiz anda pelo ângulo de ouro (137,5°), que nunca cai duas vezes no mesmo
 * lugar, e a claridade alterna entre dois tons pastel — assim não há limite de
 * tutoras e vizinhas não se confundem.
 */
function corDaPosicao(i: number): string {
  if (i < CORES_FIXAS) return `var(--serie-${i + 1})`;
  const matiz = Math.round((i * 137.508) % 360);
  const claridade = i % 2 ? 0.86 : 0.76;
  return `oklch(${claridade} 0.08 ${matiz})`;
}

/**
 * Dá uma cor a cada tutora, olhando as duas roscas de uma vez.
 *
 * A cor segue a tutora, não a posição: o tom de uma tutora em "Realizadas" é o
 * mesmo em "A realizar". A ordem vai de quem tem mais sessões (somando as duas)
 * para quem tem menos, sempre igual — nunca sorteada. "Sem tutora" é cinza e
 * fica por último.
 */
export function montarFatias(
  realizadas: TutoriasPorTutora,
  aRealizar: TutoriasPorTutora,
): { realizadas: Fatia[]; aRealizar: Fatia[] } {
  const somas = new Map<string, number>();
  for (const { tutora, total } of [...realizadas, ...aRealizar]) {
    somas.set(tutora, (somas.get(tutora) ?? 0) + total);
  }

  const ranking = [...somas.entries()]
    .filter(([tutora]) => tutora !== SEM_TUTORA)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tutora]) => tutora);
  if (somas.has(SEM_TUTORA)) ranking.push(SEM_TUTORA);

  const cores = new Map(
    ranking.map((t, i) => [t, t === SEM_TUTORA ? 'var(--serie-sem)' : corDaPosicao(i)]),
  );
  const ordem = (t: string) => ranking.indexOf(t);

  const montar = (lista: TutoriasPorTutora): Fatia[] =>
    lista
      .map(({ tutora, total }) => ({ tutora, total, cor: cores.get(tutora) ?? 'var(--serie-sem)' }))
      .sort((a, b) => ordem(a.tutora) - ordem(b.tutora));

  return { realizadas: montar(realizadas), aRealizar: montar(aRealizar) };
}
