import type { TutoriasPorTutora } from '@/lib/notion/jornada';

/** Oito cores validadas; a partir da nona tutora, um tom neutro — cada uma com o próprio nome. */
export type CorDaFatia = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'extra';

export type Fatia = { tutora: string; total: number; cor: CorDaFatia };

const CORES = 8;

/**
 * Dá uma cor a cada tutora, olhando as duas roscas de uma vez.
 *
 * A cor segue a tutora, não a posição: quem é laranja em "Realizadas" é laranja
 * em "A realizar". A ordem das cores vai de quem tem mais sessões (somando as
 * duas) para quem tem menos, sempre na mesma sequência — nunca sorteada.
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
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tutora]) => tutora);
  const cores = new Map<string, CorDaFatia>(
    ranking.map((t, i) => [t, i < CORES ? ((i + 1) as CorDaFatia) : 'extra']),
  );
  const ordem = (t: string) => ranking.indexOf(t);

  const montar = (lista: TutoriasPorTutora): Fatia[] =>
    lista
      .map(({ tutora, total }) => ({ tutora, total, cor: cores.get(tutora) ?? 'extra' }))
      .sort((a, b) => ordem(a.tutora) - ordem(b.tutora));

  return { realizadas: montar(realizadas), aRealizar: montar(aRealizar) };
}
