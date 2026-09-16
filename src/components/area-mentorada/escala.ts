import { percentual } from '@/lib/formato';

/**
 * Eixo vertical "redondo" para os gráficos do dashboard: de 0 (ou do menor
 * negativo) até um teto bonito, em quatro intervalos iguais.
 */
export function escala(valores: (number | null)[]): { min: number; max: number; marcas: number[] } {
  const numeros = valores.filter((v): v is number => v !== null);
  const maior = Math.max(0, ...numeros);
  const menor = Math.min(0, ...numeros);

  const passo = arredondar(Math.max(maior - menor, 1) / 4);
  const min = Math.floor(menor / passo) * passo;
  const max = Math.max(Math.ceil(maior / passo) * passo, min + passo);

  const marcas: number[] = [];
  for (let v = min; v <= max + passo / 2; v += passo) marcas.push(v);
  return { min, max, marcas };
}

/**
 * O menor passo "redondo" que cobre o bruto. A lista é fina de propósito: com
 * só 1, 2 e 5 um pico de 40.538 viraria um teto de 80.000 e o gráfico ficaria
 * espremido embaixo; assim o teto fica em 48.000, como no Notion.
 */
const PASSOS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function arredondar(bruto: number): number {
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const fracao = bruto / potencia;
  return PASSOS.find((p) => fracao <= p + 1e-9)! * potencia;
}

/** "R$ 34.439" — valor cheio, sem centavos, com ponto de milhar. */
export function reaisInteiros(v: number): string {
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
}

export const rotuloCurto = (v: number, formato: 'reais' | 'percentual') =>
  formato === 'reais' ? reaisInteiros(v) : percentual(v);

export const COR_DO_TOM = {
  verde: 'var(--grafico-verde)',
  azul: 'var(--grafico-azul)',
} as const;
