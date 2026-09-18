import 'server-only';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import { lerLinkDePreenchimento } from '@/lib/linkDePreenchimento';

/**
 * Quem pode ver e responder as tutorias de uma mentorada:
 * - o administrativo: vê e edita todas;
 * - a própria mentorada, logada: vê e edita as dela;
 * - a tutora: só vê (as mentoradas da carteira dela);
 * - quem tem o link de preenchimento: vê e edita só aquele material.
 */
export type Permissao = { podeEditar: boolean; quem: string; soMaterial: string | null };

export async function permissaoNasTutorias(
  mentoradaId: string,
  opcoes: { token?: string | null; materialId?: string } = {},
): Promise<Permissao | null> {
  const alvo = normalizarId(mentoradaId);

  if (opcoes.token) {
    const link = lerLinkDePreenchimento(opcoes.token);
    if (link && normalizarId(link.mentoradaId) === alvo && (!opcoes.materialId || link.materialId === opcoes.materialId)) {
      return { podeEditar: true, quem: 'link de preenchimento', soMaterial: link.materialId };
    }
  }

  const sessao = await getSessao();
  if (sessao) {
    // No "ver como" o admin enxerga como a tutora: só leitura.
    if (sessao.real.is_admin && !sessao.verComo) return { podeEditar: true, quem: sessao.real.email, soMaterial: null };
    const carteira = await carteiraDaTutora();
    return carteira.some((m) => m.id === alvo) ? { podeEditar: false, quem: sessao.real.email, soMaterial: null } : null;
  }

  const acesso = await getAcessoMentorada();
  if (acesso && normalizarId(acesso.notion_page_id) === alvo) return { podeEditar: true, quem: acesso.email, soMaterial: null };
  return null;
}
