import 'server-only';

const NOTION_VERSION = '2022-06-28';

/**
 * O Notion está migrando as bases para o modelo de "data sources": uma database
 * passa a ser um contêiner de uma ou mais fontes, e a consulta muda de endpoint.
 * A migração acontece base a base, sem aviso — a de "Área das tutoras" virou de
 * um dia para o outro e derrubou o app.
 *
 * Em vez de migrar tudo de uma vez (a versão nova muda outras respostas), o
 * cliente tenta o caminho antigo e, quando ele responde 404, descobre a fonte e
 * repete pelo endpoint novo. Funciona nos dois mundos enquanto a migração corre.
 */
const NOTION_VERSION_FONTES = '2025-09-03';

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
  init: { method?: string; body?: unknown; versao?: string } = {},
): Promise<T> {
  const { method = 'GET', body, versao = NOTION_VERSION } = init;

  // 429 e 5xx são transitórios; tenta de novo com backoff antes de desistir.
  let ultimoErro: NotionError | undefined;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token()}`,
        'Notion-Version': versao,
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
/** id da database -> id da fonte, para não redescobrir a cada consulta. */
const fontes = new Map<string, string>();

async function fonteDe(databaseId: string): Promise<string | null> {
  const conhecida = fontes.get(databaseId);
  if (conhecida) return conhecida;

  const db = await call<{ data_sources?: { id: string }[] }>(`/databases/${databaseId}`, {
    versao: NOTION_VERSION_FONTES,
  }).catch(() => null);

  const id = db?.data_sources?.[0]?.id;
  if (!id) return null;

  fontes.set(databaseId, id);
  return id;
}

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

    const res: Lista<NotionPage> = await consultar(databaseId, body);
    paginas.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor && paginas.length < limite);

  return paginas;
}

/** Consulta pelo caminho antigo; se a base já migrou, repete pelo novo. */
async function consultar(databaseId: string, body: Record<string, unknown>) {
  try {
    return await call<Lista<NotionPage>>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body,
    });
  } catch (erro) {
    if (!(erro instanceof NotionError) || erro.status !== 404) throw erro;

    const fonte = await fonteDe(databaseId);
    if (!fonte) throw erro;

    return call<Lista<NotionPage>>(`/data_sources/${fonte}/query`, {
      method: 'POST',
      body,
      versao: NOTION_VERSION_FONTES,
    });
  }
}

export async function getPage(pageId: string): Promise<NotionPage> {
  return call<NotionPage>(`/pages/${pageId}`);
}

export async function getDatabase(databaseId: string): Promise<{
  id: string;
  parent: Pai;
  title: { plain_text: string }[];
  properties: Record<string, { id: string; name: string; type: string }>;
}> {
  return call(`/databases/${databaseId}`);
}

/** Um bloco sozinho, para subir a árvore pelo `parent`. */
export async function getBlock(blockId: string): Promise<NotionBlock & { parent: Pai }> {
  return call(`/blocks/${blockId}`);
}

/** De onde uma página, base ou bloco pendura. */
export type Pai = { type: string; page_id?: string; database_id?: string; block_id?: string; workspace?: boolean };

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

export async function appendChildren(blockId: string, children: unknown[]): Promise<NotionBlock[]> {
  const res = await call<Lista<NotionBlock>>(`/blocks/${blockId}/children`, { method: 'PATCH', body: { children } });
  return res.results;
}

/**
 * Sobe um arquivo para o Notion (até 20 MB, envio único) e devolve o ID do
 * upload, para usar num bloco de imagem ou arquivo.
 */
export async function subirArquivo(arquivo: Blob, nome: string): Promise<string> {
  const criado = await call<{ id: string }>('/file_uploads', {
    method: 'POST',
    body: { mode: 'single_part', filename: nome, content_type: arquivo.type || 'application/octet-stream' },
  });

  const form = new FormData();
  form.append('file', arquivo, nome);
  const res = await fetch(`${BASE}/file_uploads/${criado.id}/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Notion-Version': NOTION_VERSION },
    body: form,
    cache: 'no-store',
  });
  if (!res.ok) {
    const corpo = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new NotionError(res.status, corpo.code ?? 'upload_falhou', corpo.message ?? 'Falha ao enviar o arquivo');
  }
  return criado.id;
}

/** Muda o conteúdo de um bloco (texto de um parágrafo, marcação de um to-do…). */
export async function updateBlock(blockId: string, body: Record<string, unknown>): Promise<NotionBlock> {
  return call<NotionBlock>(`/blocks/${blockId}`, { method: 'PATCH', body });
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
