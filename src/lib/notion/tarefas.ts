import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPage, getPage, NotionError, queryDatabase, updatePage, type NotionPage } from './client';
import { normalizarId } from './carteira';
import { AREA_DE_MEMBROS, TAREFAS, TAREFAS_ICONE } from './config';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { data, texto, titulo } from './props';

/**
 * Tarefas da mentoria, lidas e escritas direto na base "Tarefas" da mentorada.
 *
 * Cada mentorada tem a própria base, dentro do callout "Tarefas da mentoria" da
 * área de membros. O app chega a ela descendo a árvore da página dela — então
 * só lê e escreve na base dela. O ID encontrado fica em `notion_resolved_ids`.
 */

export type TarefaDaMentoria = {
  id: string;
  tarefa: string;
  /** "2026-09-20", ou null sem prazo. */
  prazo: string | null;
  observacoes: string;
  feita: boolean;
};

const chave = (mentoradaId: string) => `tarefas:${mentoradaId}`;

export async function tarefasDaMentorada(mentoradaId: string): Promise<TarefaDaMentoria[] | null> {
  return comBase(mentoradaId, async (baseId) =>
    (await queryDatabase(baseId, { limite: 500 }))
      .map(paraTarefa)
      // Pendentes primeiro, pelo prazo mais próximo; sem prazo no fim de cada grupo.
      .sort(
        (a, b) =>
          Number(a.feita) - Number(b.feita) ||
          (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
          a.tarefa.localeCompare(b.tarefa),
      ),
  );
}

export async function criarTarefa(
  mentoradaId: string,
  dados: { tarefa: string; prazo: string | null; observacoes: string },
): Promise<boolean> {
  const criada = await comBase(mentoradaId, (baseId) =>
    createPage({
      parent: { database_id: baseId },
      // Mesmo ícone do modelo de tarefas do Notion; no app ele não aparece.
      icon: { type: 'icon', icon: TAREFAS_ICONE },
      // As observações vão também dentro do card, um parágrafo por linha.
      children: dados.observacoes
        .split(/\n+/)
        .map((linha) => linha.trim())
        .filter(Boolean)
        .map((linha) => ({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: linha.slice(0, 2000) } }] },
        })),
      properties: {
        [TAREFAS.tarefa]: { title: [{ text: { content: dados.tarefa } }] },
        [TAREFAS.prazo]: { date: dados.prazo ? { start: dados.prazo } : null },
        [TAREFAS.observacoes]: {
          rich_text: dados.observacoes ? [{ text: { content: dados.observacoes.slice(0, 2000) } }] : [],
        },
        [TAREFAS.feita]: { checkbox: false },
      },
    }),
  );
  return criada !== null;
}

export async function marcarTarefa(mentoradaId: string, tarefaId: string, feita: boolean): Promise<boolean> {
  const ok = await comBase(mentoradaId, async (baseId) => {
    // O ID da tarefa veio do navegador: só mexe se ela morar na base desta mentorada.
    const pagina = await getPage(tarefaId).catch(() => null);
    const dona = pagina?.parent?.database_id;
    if (!dona || normalizarId(dona) !== normalizarId(baseId)) return false;
    // Apagada no Notion enquanto a tela estava aberta: não há o que marcar.
    if ((pagina as { archived?: boolean; in_trash?: boolean }).archived || (pagina as { in_trash?: boolean }).in_trash) return false;
    await updatePage(tarefaId, { [TAREFAS.feita]: { checkbox: feita } });
    return true;
  });
  return ok === true;
}

function paraTarefa(p: NotionPage): TarefaDaMentoria {
  return {
    id: p.id,
    tarefa: texto(p, TAREFAS.tarefa) || titulo(p),
    prazo: data(p, TAREFAS.prazo),
    observacoes: texto(p, TAREFAS.observacoes),
    feita: texto(p, TAREFAS.feita) === 'Sim',
  };
}

/** Roda `fn` com o ID da base; se a base sumiu no Notion, redescobre uma vez. */
async function comBase<T>(mentoradaId: string, fn: (baseId: string) => Promise<T>): Promise<T | null> {
  const baseId = await idDaBase(mentoradaId);
  if (!baseId) return null;
  try {
    return await fn(baseId);
  } catch (erro) {
    const sumiu = erro instanceof NotionError && (erro.status === 404 || erro.code === 'object_not_found');
    if (!sumiu) throw erro;
    const nova = await idDaBase(mentoradaId, true);
    return nova ? fn(nova) : null;
  }
}

async function idDaBase(mentoradaId: string, redescobrir = false): Promise<string | null> {
  const db = supabaseAdmin();
  if (!redescobrir) {
    const { data: salva } = await db
      .from('notion_resolved_ids')
      .select('notion_id')
      .eq('section_key', chave(mentoradaId))
      .maybeSingle();
    if (salva?.notion_id) return salva.notion_id;
  }

  const pagina = await paginaDaAreaDeMembros(mentoradaId);
  const callout = pagina ? await acharFilho(pagina, (b) => ehCallout(b, AREA_DE_MEMBROS.calloutTarefas)) : null;
  const base = callout ? await acharFilho(callout.id, (b) => b.type === 'child_database') : null;
  if (!base) return null;

  await db
    .from('notion_resolved_ids')
    .upsert({ section_key: chave(mentoradaId), notion_id: base.id, resolved_at: new Date().toISOString() });
  return base.id;
}
