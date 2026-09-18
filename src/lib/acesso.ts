import 'server-only';
import type { Visitante } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';

/** O administrativo vê todas as mentoradas; a mentorada, só a própria. */
export function podeVer(visitante: Visitante, mentoradaId: string): boolean {
  return visitante.admin || normalizarId(visitante.mentoradaId ?? '') === normalizarId(mentoradaId);
}

/**
 * Quem pode ler e gravar uma pré-sessão: o administrativo, a própria mentorada
 * (logada) ou quem tem o link de preenchimento daquela pré-sessão.
 */
export async function temAcesso(token: string | undefined, mentoradaId: string, materialId: string): Promise<boolean> {
  const { normalizarId } = await import('@/lib/notion/carteira');
  if (token) {
    const { lerLinkDePreenchimento } = await import('@/lib/linkDePreenchimento');
    const link = lerLinkDePreenchimento(token);
    if (
      link &&
      normalizarId(link.mentoradaId) === normalizarId(mentoradaId) &&
      normalizarId(link.materialId) === normalizarId(materialId)
    ) {
      return true;
    }
  }

  const { getVisitante } = await import('@/lib/session');
  const visitante = await getVisitante();
  return Boolean(visitante && podeVer(visitante, mentoradaId));
}
