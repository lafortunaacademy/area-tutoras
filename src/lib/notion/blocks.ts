import 'server-only';
import { getBlockChildren, type NotionBlock } from './client';

/**
 * Blocos de uma página do Notion, em forma simples de renderizar.
 *
 * Nunca é chamado para uma lista inteira: só quando a tutora expande um item
 * específico. É essa a regra que mantém a listagem leve.
 */

export type BlocoSimples = {
  id: string;
  tipo: string;
  texto: string;
  marcado?: boolean;
  url?: string;
  legenda?: string;
  /** Linha de tabela: o texto de cada célula. */
  celulas?: string[];
  /** Tabela: a primeira linha é cabeçalho. */
  cabecalho?: boolean;
  filhos: BlocoSimples[];
};

type RichText = { plain_text?: string };

function juntar(rt: unknown): string {
  if (!Array.isArray(rt)) return '';
  return (rt as RichText[]).map((t) => t.plain_text ?? '').join('');
}

const COM_TEXTO = new Set([
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'bulleted_list_item',
  'numbered_list_item',
  'to_do',
  'quote',
  'callout',
  'toggle',
  'code',
]);

export async function lerBlocos(pageId: string, profundidade = 2): Promise<BlocoSimples[]> {
  const brutos = await getBlockChildren(pageId);
  return Promise.all(brutos.map((b) => converter(b, profundidade)));
}

async function converter(bloco: NotionBlock, profundidade: number): Promise<BlocoSimples> {
  const conteudo = bloco[bloco.type] as Record<string, unknown> | undefined;

  const simples: BlocoSimples = {
    id: bloco.id,
    tipo: bloco.type,
    texto: COM_TEXTO.has(bloco.type) ? juntar(conteudo?.rich_text) : '',
    filhos: [],
  };

  if (bloco.type === 'to_do') simples.marcado = Boolean(conteudo?.checked);

  if (bloco.type === 'image' || bloco.type === 'file' || bloco.type === 'pdf' || bloco.type === 'video') {
    const arquivo = conteudo as { type?: string; file?: { url: string }; external?: { url: string }; caption?: unknown };
    simples.url = arquivo?.file?.url ?? arquivo?.external?.url;
    simples.legenda = juntar(arquivo?.caption);
  }

  if (bloco.type === 'table_row') {
    simples.celulas = ((conteudo?.cells as unknown[]) ?? []).map(juntar);
  }
  if (bloco.type === 'table') simples.cabecalho = Boolean(conteudo?.has_column_header);

  if (bloco.type === 'bookmark' || bloco.type === 'embed' || bloco.type === 'link_preview') {
    simples.url = conteudo?.url as string | undefined;
  }

  // `child_database` aqui é quase sempre uma visualização vinculada; a API não
  // devolve as linhas dela. As bases de verdade são lidas pelo resolver.
  // As linhas de uma tabela vêm sempre, mesmo no limite de profundidade: sem elas a tabela some.
  if (bloco.has_children && (profundidade > 0 || bloco.type === 'table') && bloco.type !== 'child_database') {
    const filhos = await getBlockChildren(bloco.id).catch(() => []);
    simples.filhos = await Promise.all(filhos.map((f) => converter(f, Math.max(profundidade - 1, 0))));
  }

  return simples;
}
