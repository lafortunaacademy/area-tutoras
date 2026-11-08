import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createPage, getPage, NotionError, queryDatabase, updatePage, type NotionPage } from './client';
import { normalizarId } from './carteira';
import { AREA_DE_MEMBROS, TAREFAS, TAREFAS_ICONE } from './config';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { data, relationIds, texto, titulo } from './props';
import { resolverDatabaseId } from './resolver';

/**
 * Tarefas da mentoria.
 *
 * Desde nov/2026 elas moram numa base única, ligada à cliente pela relação
 * "Cliente" e agrupadas por projeto. Antes cada mentorada tinha a própria
 * base, dentro do callout "Tarefas da mentoria" da área dela.
 *
 * As duas convivem de propósito: o app lê da central e, se a mentorada não
 * tiver nada lá, cai na base antiga dela. Assim ninguém fica sem tarefa no
 * meio da migração, e cada mentorada acende sozinha quando for movida. Quando
 * todas estiverem na central, o caminho antigo sai daqui.
 */

export type TarefaDaMentoria = {
  id: string;
  tarefa: string;
  /** "2026-09-20", ou null sem prazo. */
  prazo: string | null;
  observacoes: string;
  feita: boolean;
  /** O projeto a que ela pertence; `null` na base antiga, que não tem projeto. */
  projetoId: string | null;
};

const chave = (mentoradaId: string) => `tarefas:${mentoradaId}`;

const ordenar = (lista: TarefaDaMentoria[]) =>
  // Pendentes primeiro, pelo prazo mais próximo; sem prazo no fim de cada grupo.
  lista.sort(
    (a, b) =>
      Number(a.feita) - Number(b.feita) ||
      (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
      a.tarefa.localeCompare(b.tarefa),
  );

/** As tarefas da base única, pela relação com a cliente. */
async function daBaseCentral(mentoradaId: string): Promise<TarefaDaMentoria[]> {
  const dbId = await resolverDatabaseId('tarefas');
  const linhas = await queryDatabase(dbId, {
    filter: { property: TAREFAS.cliente, relation: { contains: normalizarId(mentoradaId) } },
    limite: 500,
  });
  return ordenar(linhas.map(paraTarefa));
}

export async function tarefasDaMentorada(mentoradaId: string): Promise<TarefaDaMentoria[] | null> {
  const central = await daBaseCentral(mentoradaId).catch(() => null);
  if (central && central.length > 0) return central;

  const antigas = await comBase(mentoradaId, async (baseId) =>
    (await queryDatabase(baseId, { limite: 500 }))
      .map(paraTarefa)
      .sort(
        (a, b) =>
          Number(a.feita) - Number(b.feita) ||
          (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
          a.tarefa.localeCompare(b.tarefa),
      ),
  );

  // Sem base antiga e sem linhas na central: a mentorada simplesmente não tem
  // tarefa, que é diferente de não ter conseguido ler.
  return antigas ?? central;
}

/**
 * Onde escrever a tarefa nova: na central, se a mentorada já está lá, na base
 * antiga dela enquanto não estiver. Escrever sempre na central deixaria a
 * lista partida em duas para quem ainda não migrou.
 */
async function ondeEscrever(mentoradaId: string): Promise<{ id: string; central: boolean } | null> {
  const central = await daBaseCentral(mentoradaId).catch(() => null);
  if (central && central.length > 0) return { id: await resolverDatabaseId('tarefas'), central: true };

  const antiga = await idDaBase(mentoradaId);
  if (antiga) return { id: antiga, central: false };

  // Mentorada nova, sem base antiga: a central é a casa dela.
  return central ? { id: await resolverDatabaseId('tarefas'), central: true } : null;
}

export async function criarTarefa(
  mentoradaId: string,
  dados: { tarefa: string; prazo: string | null; observacoes: string },
): Promise<string | null> {
  const onde = await ondeEscrever(mentoradaId);
  if (!onde) return null;

  const criada = await (async () =>
    createPage({
      parent: { database_id: onde.id },
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
        ...(onde.central
          ? { [TAREFAS.cliente]: { relation: [{ id: normalizarId(mentoradaId) }] } }
          : {}),
      },
    }))();
  // O id da tarefa nova: quem chamou mostra na lista sem buscar tudo de novo.
  return criada?.id ?? null;
}

export async function marcarTarefa(mentoradaId: string, tarefaId: string, feita: boolean): Promise<boolean> {
  // O ID da tarefa veio do navegador, então nada é marcado antes de o servidor
  // confirmar que aquela tarefa é mesmo desta mentorada.
  const pagina = await getPage(tarefaId).catch(() => null);
  if (!pagina) return false;
  if ((pagina as { archived?: boolean; in_trash?: boolean }).archived || (pagina as { in_trash?: boolean }).in_trash) {
    return false;
  }

  const dona = pagina.parent?.database_id;
  if (!dona) return false;

  const central = await resolverDatabaseId('tarefas').catch(() => null);
  const naCentral = central !== null && normalizarId(dona) === normalizarId(central);

  const minha = naCentral
    ? relationIds(pagina, TAREFAS.cliente).some((id) => normalizarId(id) === normalizarId(mentoradaId))
    : normalizarId(dona) === normalizarId((await idDaBase(mentoradaId)) ?? '');

  if (!minha) return false;

  await updatePage(tarefaId, { [TAREFAS.feita]: { checkbox: feita } });
  return true;
}

function paraTarefa(p: NotionPage): TarefaDaMentoria {
  return {
    id: p.id,
    tarefa: texto(p, TAREFAS.tarefa) || titulo(p),
    prazo: data(p, TAREFAS.prazo),
    observacoes: texto(p, TAREFAS.observacoes),
    feita: texto(p, TAREFAS.feita) === 'Sim',
    projetoId: relationIds(p, TAREFAS.projeto)[0] ?? null,
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
