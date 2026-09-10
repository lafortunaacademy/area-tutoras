import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DATABASES, type SectionKey } from './config';
import { getBlockChildren, getDatabase, getPage, search, type NotionBlock } from './client';

/**
 * Descobre o ID de cada database do Notion e guarda no Supabase.
 *
 * Este é o ÚNICO dado do Notion que fica salvo no banco do app: um ID.
 * Descobri-lo é caro (varre a árvore, faz search), mas o conteúdo em si nunca
 * é cacheado — toda leitura vai ao Notion na hora.
 */

const memoria = new Map<SectionKey, string>();

export async function resolverDatabaseId(secao: SectionKey): Promise<string> {
  const doProcesso = memoria.get(secao);
  if (doProcesso) return doProcesso;

  // Um ID fixado no .env vence tudo: é a saída de emergência quando a
  // descoberta automática não dá conta (base renomeada, view linkada, etc).
  const fixado = process.env[`NOTION_DB_${secao.toUpperCase()}`];
  if (fixado) {
    memoria.set(secao, fixado);
    return fixado;
  }

  const db = supabaseAdmin();
  const { data: cache } = await db
    .from('notion_resolved_ids')
    .select('notion_id')
    .eq('section_key', secao)
    .maybeSingle();

  if (cache?.notion_id) {
    memoria.set(secao, cache.notion_id);
    return cache.notion_id;
  }

  const id = await descobrir(secao);

  await db.from('notion_resolved_ids').upsert({
    section_key: secao,
    notion_id: id,
    resolved_at: new Date().toISOString(),
  });
  memoria.set(secao, id);
  return id;
}

async function descobrir(secao: SectionKey): Promise<string> {
  const titulo = DATABASES[secao];

  // Caminho 1: busca por título. É o mais confiável, porque enxerga a database
  // de verdade — não a "visualização vinculada" que aparece na página.
  const achados = await search(titulo, { property: 'object', value: 'database' });
  const exato = achados.find(
    (r) =>
      r.object === 'database' &&
      (r.title ?? []).map((t) => t.plain_text).join('').trim().toLowerCase() ===
        titulo.toLowerCase(),
  );
  if (exato) return exato.id;

  // Caminho 2: varre a árvore a partir da página raiz procurando uma database
  // inline com esse título.
  const raiz = process.env.NOTION_ROOT_PAGE_ID;
  if (raiz) {
    const naArvore = await procurarNaArvore(raiz, titulo, 3);
    if (naArvore) return naArvore;
  }

  throw new Error(
    `Não achei a base "${titulo}" no Notion. Ou ela não foi compartilhada com a ` +
      `integração, ou aparece na página só como visualização vinculada (linked view), ` +
      `que a API não resolve. Nesse caso, abra a base no Notion, copie o ID da URL e ` +
      `defina NOTION_DB_${secao.toUpperCase()} no .env.local.`,
  );
}

async function procurarNaArvore(
  blocoId: string,
  titulo: string,
  profundidade: number,
): Promise<string | null> {
  if (profundidade < 0) return null;

  let filhos: NotionBlock[];
  try {
    filhos = await getBlockChildren(blocoId);
  } catch {
    return null;
  }

  for (const bloco of filhos) {
    if (bloco.type === 'child_database') {
      const nome = (bloco.child_database as { title?: string })?.title ?? '';
      if (nome.trim().toLowerCase() === titulo.toLowerCase()) return bloco.id;
    }
  }

  for (const bloco of filhos) {
    if (bloco.type === 'child_page' || (bloco.has_children && bloco.type !== 'child_database')) {
      const achado = await procurarNaArvore(bloco.id, titulo, profundidade - 1);
      if (achado) return achado;
    }
  }

  return null;
}

/**
 * Saída para o caso da "visualização vinculada": a API não resolve a view, mas
 * resolve um REGISTRO que já aponta para a base. Dado o ID de uma página que
 * mora na base procurada, o `parent.database_id` dela é o ID que se quer.
 */
export async function databaseIdPeloRegistro(pageId: string): Promise<string | null> {
  try {
    const page = await getPage(pageId);
    return page.parent?.database_id ?? null;
  } catch {
    return null;
  }
}

/** Confere se os nomes de propriedade em `config.ts` batem com o schema real. */
export async function conferirSchema(
  secao: SectionKey,
  esperadas: string[],
): Promise<{ ok: string[]; faltando: string[]; disponiveis: string[] }> {
  const id = await resolverDatabaseId(secao);
  const db = await getDatabase(id);
  const disponiveis = Object.values(db.properties).map((p) => p.name);
  const ok = esperadas.filter((n) => disponiveis.includes(n));
  const faltando = esperadas.filter((n) => !disponiveis.includes(n));
  return { ok, faltando, disponiveis };
}
