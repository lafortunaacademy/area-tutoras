import 'server-only';
import type { Visitante } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';

/** O administrativo vê todas as mentoradas; a mentorada, só a própria. */
export function podeVer(visitante: Visitante, mentoradaId: string): boolean {
  return visitante.admin || normalizarId(visitante.mentoradaId ?? '') === normalizarId(mentoradaId);
}
