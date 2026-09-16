import 'server-only';
import { notFound } from 'next/navigation';
import { carteiraDaTutora, normalizarId, type Mentorada } from './carteira';

/**
 * Porta de entrada de toda página de mentorada.
 *
 * Um ID que não está na carteira vira 404 — a mesma resposta de um ID que não
 * existe, para não confirmar a existência da mentorada de outra tutora.
 */
export async function exigirMentorada(mentoradaId: string): Promise<Mentorada> {
  const carteira = await carteiraDaTutora();
  const mentorada = carteira.find((m) => m.id === normalizarId(mentoradaId));
  if (!mentorada) notFound();
  return mentorada;
}

/**
 * Porta das páginas da área das mentoradas: além de existir, a mentorada tem de
 * estar no modelo novo. Quem ainda está na área antiga dá 404, como se não
 * existisse ali.
 */
export async function exigirMentoradaDoModeloNovo(mentoradaId: string): Promise<Mentorada> {
  const { mentoradasDoModeloNovo } = await import('./modelo');
  const lista = await mentoradasDoModeloNovo();
  const mentorada = lista.find((m) => m.id === normalizarId(mentoradaId));
  if (!mentorada) notFound();
  return mentorada;
}
