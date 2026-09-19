import 'server-only';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import type { QuemPreenche } from './modelo';

/**
 * Quem pode ver e responder as tutorias de uma mentorada.
 *
 * Ver: o administrativo, a tutora (mentoradas da carteira dela) e a própria
 * mentorada. Escrever depende de quem preenche o material:
 * - da mentorada (pré-sessões): a mentorada e o administrativo;
 * - registro de cada tutoria (marcado "equipe"): a tutora, o administrativo e
 *   também a própria mentorada.
 * No "ver como", o admin escreve como a tutora que está vendo.
 */
export type Permissao = { podeEditar: boolean; quem: string };

export async function permissaoNasTutorias(mentoradaId: string, quemPreenche: QuemPreenche = 'mentorada'): Promise<Permissao | null> {
  const alvo = normalizarId(mentoradaId);

  const sessao = await getSessao();
  if (sessao) {
    const admin = sessao.real.is_admin && !sessao.verComo;
    if (admin) return { podeEditar: true, quem: sessao.real.email };
    const carteira = await carteiraDaTutora();
    if (!carteira.some((m) => m.id === alvo)) return null;
    // No "ver como", nada é gravado em nome da tutora.
    return { podeEditar: quemPreenche === 'equipe' && !sessao.verComo, quem: sessao.real.email };
  }

  const acesso = await getAcessoMentorada();
  if (acesso && normalizarId(acesso.notion_page_id) === alvo) {
    return { podeEditar: true, quem: acesso.email };
  }
  return null;
}
