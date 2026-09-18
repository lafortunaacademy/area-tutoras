import 'server-only';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';

/**
 * Quem pode ver e responder as tutorias de uma mentorada:
 * - o administrativo: vê tudo (no "ver como", só leitura, como a tutora);
 * - a própria mentorada, logada: responde as dela;
 * - a tutora: só vê (as mentoradas da carteira dela).
 */
export type Permissao = { podeEditar: boolean; quem: string };

export async function permissaoNasTutorias(mentoradaId: string): Promise<Permissao | null> {
  const alvo = normalizarId(mentoradaId);

  const sessao = await getSessao();
  if (sessao) {
    if (sessao.real.is_admin && !sessao.verComo) return { podeEditar: true, quem: sessao.real.email };
    const carteira = await carteiraDaTutora();
    return carteira.some((m) => m.id === alvo) ? { podeEditar: false, quem: sessao.real.email } : null;
  }

  const acesso = await getAcessoMentorada();
  if (acesso && normalizarId(acesso.notion_page_id) === alvo) return { podeEditar: true, quem: acesso.email };
  return null;
}
