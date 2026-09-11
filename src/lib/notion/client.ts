import 'server-only';

const NOTION_VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';

export class NotionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

function token(): string {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new Error('NOTION_TOKEN não configurado.');
  return t;
}

/**
 * Chamada crua à API do Notion.
 *
 * `cache: 'no-store'` é deliberado e é o coração da arquitetura: o Notion é a
 * fonte de verdade e cada carregamento de página lê o estado atual dele. Nada
 * de conteúdo do Notion é persistido no app.
 */
async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = init;

  // 429 e 5xx são transitórios; tenta de novo com backoff antes de desistir.
  let ultimoErro: NotionError | undefined;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Notion-Version': NOTION_VERSION,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (res.ok) return (await res.json()) as T;

    const texto = await res.text();
    let code = 'unknown';
    let message = texto;
    try {
      const json = JSON.parse(texto) as { code?: string; message?: string };
      code = json.code ?? code;
      message = json.message ?? message;
    } catch {
      // resposta não-JSON: fica com o texto cru mesmo
    }

    ultimoErro = new NotionError(res.status, code, message);
    if (res.status !== 429 && res.status < 500) throw ultimoErro;

    const espera = Number(res.headers.get('retry-after')) * 1000 || 2 ** tentativa * 400;
    await new Promise((r) => setTimeout(r, espera));
  }

  throw ultimoErro ?? new NotionError(500, 'unknown', 'Falha ao falar com o Notion.');
}

export type NotionPage = {
  id: string;
  object: 'page';
  url: string;
  icon: unknown;
  cover: unknown;
  parent: { type: string; database_id?: string; page_id?: string };
  properties: Record<string, NotionProperty>;
  last_edited_time: string;
};

export type NotionProperty = Record<string, unknown> & { type: string; id: string };

export type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
} & Record<string, unknown>;

type Lista<T> = { results: T[]; next_cursor: string | null; has_more: boolean };

/** Consulta uma database, paginando até o fim (ou até `limite` registros). */
export async function queryDatabase(
  databaseId: string,
  opts: {
    filter?: unknown;
    sorts?: unknown[];
    limite?: number;
  } = {},
): Promise<NotionPage[]> {
  const { filter, sorts, limite = 500 } = opts;
  const paginas: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const body: Record<string, unknown> = { page_size: Math.min(100, limite - paginas.length) };
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (cursor) body.start_cursor = cursor;

    const res: Lista<NotionPage> = await call(`/databases/${databaseId}/query`, {
      method: 'POST',
      body,
    });
    paginas.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor && paginas.length < limite);

  return paginas;
}

export async function getPage(pageId: string): Promise<NotionPage> {
  return call<NotionPage>(`/pages/${pageId}`);
}

export async function getDatabase(databaseId: string): Promise<{
  id: string;
  title: { plain_text: string }[];
  properties: Record<string, { id: string; name: string; type: string }>;
}> {
  return call(`/databases/${databaseId}`);
}

/** Filhos diretos de um bloco/página. Não desce na árvore — quem desce é `blocks.ts`. */
export async function getBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocos: NotionBlock[] = [];
  let cursor: string | null = null;

  do {
    const qs = new URLSearchParams({ page_size: '100' });
    if (cursor) qs.set('start_cursor', cursor);
    const res: Lista<NotionBlock> = await call(`/blocks/${blockId}/children?${qs}`);
    blocos.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);

  return blocos;
}

export async function createPage(body: {
  parent: { database_id: string };
  properties: Record<string, unknown>;
  children?: unknown[];
  icon?: unknown;
}): Promise<NotionPage> {
  return call<NotionPage>('/pages', { method: 'POST', body });
}

/** Arquiva um bloco. No Notion isso é o "apagar" — dá para restaurar da lixeira. */
export async function deleteBlock(blockId: string): Promise<void> {
  await call(`/blocks/${blockId}`, { method: 'DELETE' });
}

export async function appendChildren(blockId: string, children: unknown[]): Promise<void> {
  await call(`/blocks/${blockId}/children`, { method: 'PATCH', body: { children } });
}

export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>,
): Promise<NotionPage> {
  return call<NotionPage>(`/pages/${pageId}`, { method: 'PATCH', body: { properties } });
}

export type NotionUser = {
  id: string;
  name?: string;
  type?: string;
  person?: { email?: string };
};

export async function getUser(userId: string): Promise<NotionUser> {
  return call<NotionUser>(`/users/${userId}`);
}

/** Busca por título. Só enxerga o que foi compartilhado com a integração. */
export async function search(
  query: string,
  filter?: { value: 'page' | 'database'; property: 'object' },
): Promise<Array<{ id: string; object: string; title?: { plain_text: string }[] }>> {
  const res = await call<Lista<{ id: string; object: string; title?: { plain_text: string }[] }>>(
    '/search',
    { method: 'POST', body: { query, filter, page_size: 100 } },
  );
  return res.results;
}
