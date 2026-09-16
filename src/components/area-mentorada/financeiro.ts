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

/** Todos os anos com algum dado (meses, trimestres ou a base de anos), do mais recente ao mais antigo. */
export function anosDisponiveis(g: GestaoDeResultados): string[] {
  return [...new Set([...anosComMovimento(g), ...g.anos.map((a) => a.ano)])].filter(Boolean).sort().reverse();
}

/** O ano pedido no endereço (?ano=), se existir; senão o principal. */
export function anoSelecionado(g: GestaoDeResultados, pedido: string | undefined): string {
  return pedido && anosDisponiveis(g).includes(pedido)
    ? pedido
    : anoPrincipal(g, String(new Date().getFullYear()));
}
