import 'server-only';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { cache } from 'react';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import { TEMAS_DE_TUTORIA } from '@/lib/notion/config';
import { especialidadesDasTutoras } from '@/lib/notion/hub';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

export async function permissaoNasTutorias(
  mentoradaId: string,
  quemPreenche: QuemPreenche = 'mentorada',
  /** Com o material, a tutora só passa se ele for de uma tutoria da área dela. */
  materialId?: string,
): Promise<Permissao | null> {
  const alvo = normalizarId(mentoradaId);

  const sessao = await getSessao();
  if (sessao) {
    const admin = sessao.real.is_admin && !sessao.verComo;
    if (admin) return { podeEditar: true, quem: sessao.real.email };
    const carteira = await carteiraDaTutora();
    if (!carteira.some((m) => m.id === alvo)) return null;
    if (materialId && !(await materialLiberado(materialId))) return null;
    // No "ver como", nada é gravado em nome da tutora.
    return { podeEditar: quemPreenche === 'equipe' && !sessao.verComo, quem: sessao.real.email };
  }

  const acesso = await getAcessoMentorada();
  if (acesso && normalizarId(acesso.notion_page_id) === alvo) {
    return { podeEditar: true, quem: acesso.email };
  }
  return null;
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/**
 * Ids das tutorias que a tutora logada (ou a do "ver como") acompanha: as de
 * mesma área das especialidades dela no Notion (Terapia -> Terapêuticas,
 * Conteúdo -> Posicionamento…). `null` quando vê todas (o administrativo) ou
 * quando não é tutora.
 */
export const tutoriasDaTutora = cache(async (): Promise<Set<string> | null> => {
  const sessao = await getSessao();
  if (!sessao || (sessao.real.is_admin && !sessao.verComo)) return null;

  const [especialidades, { data: tutorias }] = await Promise.all([
    especialidadesDasTutoras(),
    supabaseAdmin().from('tutoria_tutorias').select('id, nome'),
  ]);
  const minhas = new Set((especialidades.get(normalizarId(sessao.tutora.notion_tutora_page_id)) ?? []).map(semAcento));
  const trechos = TEMAS_DE_TUTORIA.filter((t) => t.especialidades.some((e) => minhas.has(semAcento(e)))).map((t) => t.trecho);

  return new Set(
    (tutorias ?? []).filter((t) => trechos.some((tr) => semAcento(t.nome as string).includes(tr))).map((t) => t.id as string),
  );
});

async function materialLiberado(materialId: string): Promise<boolean> {
  const liberadas = await tutoriasDaTutora();
  if (!liberadas) return true;
  const { data } = await supabaseAdmin().from('tutoria_materiais').select('tutoria_id').eq('id', materialId).maybeSingle();
  return Boolean(data && liberadas.has(data.tutoria_id as string));
}
