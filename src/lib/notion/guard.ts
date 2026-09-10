import 'server-only';
import { notFound } from 'next/navigation';
import { carteiraDaTutora, normalizarId, type Mentorada } from './carteira';

/**
 * Porta de entrada de toda página de mentorada.
 *
 * Um ID que não está na carteira vira 404 — a mesma resposta de um ID que não
 * existe, para não confirmar a existência da mentorada de outra tutora.
 */
export async function exigirMentorada(
  tutoraPageId: string,
  mentoradaId: string,
): Promise<Mentorada> {
  const carteira = await carteiraDaTutora(tutoraPageId);
  const mentorada = carteira.find((m) => m.id === normalizarId(mentoradaId));
  if (!mentorada) notFound();
  return mentorada;
}
