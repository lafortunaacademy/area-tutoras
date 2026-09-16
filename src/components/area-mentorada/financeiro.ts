import type { GestaoDeResultados } from '@/lib/notion/gestao';

/** Anos que aparecem nos meses ou trimestres, do mais recente ao mais antigo. */
export function anosComMovimento(g: GestaoDeResultados): string[] {
  const anos = new Set([...g.meses.map((m) => m.ano), ...g.trimestres.map((t) => t.ano)].filter(Boolean));
  return [...anos].sort().reverse();
}

/** O ano que abre na tela: o corrente, se já tiver linhas; senão o mais recente. */
export function anoPrincipal(g: GestaoDeResultados, anoAtual: string): string {
  const anos = anosComMovimento(g);
  return anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual);
}
