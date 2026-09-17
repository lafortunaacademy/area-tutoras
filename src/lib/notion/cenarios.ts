import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBlockChildren, getPage, NotionError, queryDatabase, type NotionBlock } from './client';
import { normalizarId } from './carteira';
import { AREA_DE_MEMBROS, CENARIOS } from './config';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { texto, titulo } from './props';

/**
 * Cenário atual × cenário desejado: um cartão por ano na base "Cenários", dentro
 * do callout "Planejamento estratégico" da área de membros. A Fernanda cria um
 * cartão novo a cada ano; o app só lê.
 */

export type CartaoCenario = { id: string; titulo: string; ano: string };

/** Uma coluna do cartão (um callout no Notion) já organizada para a tela. */
export type ColunaCenario = { titulo: string; itens: ItemCenario[] };
export type ItemCenario =
  | { tipo: 'secao'; texto: string }
  | { tipo: 'destaque'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'item'; texto: string };

export async function cartoesDeCenario(mentoradaId: string): Promise<CartaoCenario[] | null> {
  return comBase(mentoradaId, async (baseId) =>
    (await queryDatabase(baseId, { limite: 50 }))
      .map((p) => ({ id: p.id, titulo: texto(p, CENARIOS.titulo) || titulo(p), ano: texto(p, CENARIOS.ano) }))
      .sort((a, b) => b.ano.localeCompare(a.ano)),
  );
}

/** `null` se o cartão não existir ou não for desta mentorada (o ID veio do endereço). */
export async function lerCenario(
  mentoradaId: string,
  cartaoId: string,
): Promise<{ cartao: CartaoCenario; colunas: ColunaCenario[] } | null> {
  return (
    (await comBase(mentoradaId, async (baseId) => {
      const pagina = await getPage(cartaoId).catch(() => null);
      const dona = pagina?.parent?.database_id;
      if (!pagina || !dona || normalizarId(dona) !== normalizarId(baseId)) return null;

      const cartao = {
        id: pagina.id,
        titulo: texto(pagina, CENARIOS.titulo) || titulo(pagina),
        ano: texto(pagina, CENARIOS.ano),
      };
      return { cartao, colunas: await colunasDoCartao(pagina.id) };
    })) ?? null
  );
}

/**
 * No modelo, o cartão é uma linha de colunas com um callout em cada. Se alguém
 * montar diferente (callouts soltos, sem colunas), cada callout vira uma coluna
 * do mesmo jeito.
 */
async function colunasDoCartao(paginaId: string): Promise<ColunaCenario[]> {
  const topo = await getBlockChildren(paginaId);
  const callouts: NotionBlock[] = [];

  for (const b of topo) {
    if (b.type === 'callout') callouts.push(b);
    if (b.type === 'column_list') {
      for (const coluna of await getBlockChildren(b.id)) {
        for (const dentro of await getBlockChildren(coluna.id)) {
          if (dentro.type === 'callout') callouts.push(dentro);
        }
      }
    }
  }

  return Promise.all(
    callouts.map(async (c) => ({
      titulo: textoDoBloco(c),
      itens: c.has_children ? await itens(c.id) : [],
    })),
  );
}

async function itens(blocoId: string): Promise<ItemCenario[]> {
  const saida: ItemCenario[] = [];
  for (const b of await getBlockChildren(blocoId)) {
    const t = textoDoBloco(b);
    const cor = (b[b.type] as { color?: string } | undefined)?.color ?? 'default';

    if (b.type.startsWith('heading_')) {
      if (t) saida.push({ tipo: 'secao', texto: t });
    } else if (b.type === 'paragraph') {
      // Parágrafo com fundo colorido é o subtítulo do modelo (Produto, Posicionamento…).
      if (t) saida.push({ tipo: cor.endsWith('_background') ? 'destaque' : 'texto', texto: t });
    } else if (b.type === 'bulleted_list_item' || b.type === 'numbered_list_item' || b.type === 'to_do') {
      if (t) saida.push({ tipo: 'item', texto: t });
    } else if (t) {
      saida.push({ tipo: 'texto', texto: t });
    }

    // Conteúdo aninhado (dentro de toggle, lista…) entra logo abaixo.
    if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') {
      saida.push(...(await itens(b.id)));
    }
  }
  return saida;
}

function textoDoBloco(b: NotionBlock): string {
  const conteudo = b[b.type] as { rich_text?: { plain_text?: string }[] } | undefined;
  return (conteudo?.rich_text ?? []).map((t) => t.plain_text ?? '').join('').trim();
}

// --- ID da base ---------------------------------------------------------------

const chave = (mentoradaId: string) => `cenarios:${mentoradaId}`;

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
  const callout = pagina
    ? await acharFilho(pagina, (b) => ehCallout(b, AREA_DE_MEMBROS.calloutPlanejamento))
    : null;
  // Dentro do callout há duas bases (Cenários e a dos objetivos): vale a de título "Cenários".
  const base = callout
    ? await acharFilho(
        callout.id,
        (b) =>
          b.type === 'child_database' &&
          ((b.child_database as { title?: string })?.title ?? '').trim().toLowerCase() ===
            AREA_DE_MEMBROS.baseCenarios.toLowerCase(),
      )
    : null;
  if (!base) return null;

  await db
    .from('notion_resolved_ids')
    .upsert({ section_key: chave(mentoradaId), notion_id: base.id, resolved_at: new Date().toISOString() });
  return base.id;
}
