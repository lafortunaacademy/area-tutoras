/**
 * Formatação de números para a tela. Sem `server-only`: serve ao servidor e aos
 * componentes de cliente, que não podem receber funções por props.
 */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Célula vazia no Notion vira "—", não "R$ 0,00": zero é informação, vazio não é. */
export function reais(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : BRL.format(n);
}

/** Recebe fração (0,25) — é assim que as fórmulas de lucro do modelo calculam. */
export function percentual(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${(n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/** "R$ 3,5 mil" — para rótulo de gráfico, onde o valor cheio não cabe. */
export function reaisCompacto(n: number): string {
  const a = Math.abs(n);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (a >= 1_000_000) return `R$ ${fmt(n / 1_000_000)} mi`;
  if (a >= 1_000) return `R$ ${fmt(n / 1_000)} mil`;
  return `R$ ${fmt(n)}`;
}

/** Soma ignorando vazios; tudo vazio continua vazio. */
export function soma(valores: (number | null)[]): number | null {
  const cheios = valores.filter((v): v is number => v !== null);
  return cheios.length ? cheios.reduce((a, b) => a + b, 0) : null;
}
