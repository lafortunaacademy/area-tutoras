import 'server-only';
import { appendChildren, updateBlock, type NotionBlock } from './client';

/**
 * As escritas que o app faz dentro de uma página do Notion.
 *
 * Vale para qualquer página que a pessoa preenche pelo app — a pré-sessão de
 * uma tutoria ou a página de uma sessão, que agora nasce de um modelo diferente
 * para cada tipo. Quem chama já conferiu que o bloco é daquela página; aqui só
 * se escreve.
 */

export type RespostaEmBloco =
  | { acao: 'marcar'; blocoId: string; marcado: boolean }
  | { acao: 'texto'; blocoId: string; texto: string }
  /** Pergunta ainda sem parágrafo de resposta: cria um dentro do callout. */
  | { acao: 'adicionar'; blocoId: string; texto: string }
  /** Uma linha inteira de uma tabela, de uma vez só. */
  | { acao: 'linhaDaTabela'; blocoId: string; celulas: string[] }
  /** Mais uma linha vazia no fim de uma tabela. */
  | { acao: 'linha'; blocoId: string };

/** Devolve o id do bloco escrito (o novo, quando cria); `null` se o tipo não bate. */
export async function responderNoBloco(bloco: NotionBlock, resposta: RespostaEmBloco): Promise<string | null> {
  if (resposta.acao === 'marcar') {
    if (bloco.type !== 'to_do') return null;
    await updateBlock(bloco.id, { to_do: { checked: resposta.marcado } });
    return bloco.id;
  }

  if (resposta.acao === 'texto') {
    if (bloco.type !== 'paragraph') return null;
    await updateBlock(bloco.id, { paragraph: { rich_text: textoRico(resposta.texto) } });
    return bloco.id;
  }

  if (resposta.acao === 'linhaDaTabela') {
    if (bloco.type !== 'table_row') return null;
    const atuais = ((bloco.table_row as { cells?: unknown[][] })?.cells ?? []).length;
    if (resposta.celulas.length !== atuais) return null;
    // A linha inteira vai junto: célula a célula, duas gravações ao mesmo tempo
    // se atropelavam e só a última sobrevivia.
    await updateBlock(bloco.id, { table_row: { cells: resposta.celulas.map((c) => textoRico(c)) } });
    return bloco.id;
  }

  if (resposta.acao === 'linha') {
    if (bloco.type !== 'table') return null;
    const largura = Number((bloco.table as { table_width?: number })?.table_width ?? 0);
    if (!largura) return null;
    const [nova] = await appendChildren(bloco.id, [
      { object: 'block', type: 'table_row', table_row: { cells: Array.from({ length: largura }, () => []) } },
    ]);
    return nova?.id ?? null;
  }

  if (bloco.type !== 'callout') return null;
  const [novo] = await appendChildren(bloco.id, [
    { object: 'block', type: 'paragraph', paragraph: { rich_text: textoRico(resposta.texto) } },
  ]);
  return novo?.id ?? null;
}

/** O Notion aceita até 2.000 caracteres por pedaço de texto. */
function textoRico(texto: string) {
  const pedacos = texto.match(/[\s\S]{1,2000}/g) ?? [];
  return pedacos.slice(0, 100).map((content) => ({ type: 'text', text: { content } }));
}
