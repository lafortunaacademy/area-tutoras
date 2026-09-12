import 'server-only';
import { appendChildren, deleteBlock, getBlockChildren, getPage, updatePage } from './client';
import type { NotionBlock } from './client';

/**
 * As sessões de tutoria — onde a tutora registra o que aconteceu.
 *
 * Cada sessão é uma página com quatro callouts, identificados pelo ÍCONE e não
 * pelo texto: o do resumo vem com o título vazio (o rótulo está num toggle
 * dentro dele), então casar por texto não funcionaria.
 *
 * Tarefas fica de fora por decisão da Luíza: é uma base própria por sessão e não
 * entra nesta etapa.
 */

const ICONES = {
  anotacoes: 'drafts',
  resumo: 'reorder',
  tarefas: 'checkmark-square',
  gravacao: 'video-camera',
} as const;

export type ConteudoSessao = {
  anotacoes: string;
  resumo: string;
  gravacao: string;
};

function iconeDoBloco(bloco: NotionBlock): string {
  const callout = bloco.callout as { icon?: { icon?: { name?: string }; emoji?: string } } | undefined;
  return callout?.icon?.icon?.name ?? callout?.icon?.emoji ?? '';
}

function textoDoBloco(bloco: NotionBlock): string {
  const conteudo = bloco[bloco.type] as { rich_text?: { plain_text?: string }[] } | undefined;
  return (conteudo?.rich_text ?? []).map((t) => t.plain_text ?? '').join('').trim();
}

/** Junta o texto de uma sub-árvore: o resumo mora dentro de um toggle. */
async function textoProfundo(blocos: NotionBlock[]): Promise<string> {
  const partes: string[] = [];

  for (const b of blocos) {
    const t = textoDoBloco(b);
    if (t && t !== 'Resumo da sessão') partes.push(t);

    if (b.has_children) {
      const filhos = await getBlockChildren(b.id).catch(() => []);
      const dentro = await textoProfundo(filhos);
      if (dentro) partes.push(dentro);
    }
  }

  return partes.join('\n');
}

export async function lerSessao(pageId: string): Promise<ConteudoSessao> {
  const blocos = await getBlockChildren(pageId);
  const vazio: ConteudoSessao = { anotacoes: '', resumo: '', gravacao: '' };

  for (const bloco of blocos) {
    const icone = iconeDoBloco(bloco);
    if (!bloco.has_children) continue;

    const filhos = await getBlockChildren(bloco.id).catch(() => []);

    if (icone === ICONES.anotacoes) vazio.anotacoes = await textoProfundo(filhos);
    if (icone === ICONES.resumo) vazio.resumo = await textoProfundo(filhos);
    if (icone === ICONES.gravacao) {
      const video = filhos.find((f) => f.type === 'video' || f.type === 'embed' || f.type === 'bookmark');
      const dados = video?.[video.type] as { external?: { url: string }; url?: string } | undefined;
      vazio.gravacao = dados?.external?.url ?? dados?.url ?? '';
    }
  }

  return vazio;
}

function bullet(texto: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

function paragrafo(texto: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

/** O resumo vive dentro de um toggle, como no modelo escrito à mão. */
function toggleResumo(texto: string) {
  return {
    object: 'block',
    type: 'toggle',
    toggle: {
      rich_text: [{ type: 'text', text: { content: 'Resumo da sessão' } }],
      children: texto.trim() ? [paragrafo(texto.trim())] : [],
    },
  };
}

function video(url: string) {
  return { object: 'block', type: 'video', video: { type: 'external', external: { url } } };
}

/**
 * Regrava anotações, resumo e gravação.
 *
 * Mexe só dentro dos três callouts; Tarefas e qualquer coisa escrita fora deles
 * fica intacta. Cada seção é apagada e reescrita porque a API do Notion não
 * troca os filhos de um bloco de uma vez — e apagar, lá, é arquivar.
 */
export async function salvarSessao(pageId: string, dados: ConteudoSessao): Promise<void> {
  const blocos = await getBlockChildren(pageId);

  for (const bloco of blocos) {
    const icone = iconeDoBloco(bloco);

    let novos: unknown[] | null = null;
    if (icone === ICONES.anotacoes) {
      const itens = dados.anotacoes
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
      novos = itens.length ? itens.map(bullet) : [bullet('')];
    } else if (icone === ICONES.resumo) {
      novos = [toggleResumo(dados.resumo)];
    } else if (icone === ICONES.gravacao) {
      novos = dados.gravacao.trim() ? [video(dados.gravacao.trim())] : [];
    }

    if (!novos) continue;

    const antigos = bloco.has_children ? await getBlockChildren(bloco.id).catch(() => []) : [];
    for (const antigo of antigos) await deleteBlock(antigo.id).catch(() => {});
    if (novos.length) await appendChildren(bloco.id, novos);
  }
}

export async function marcarStatus(pageId: string, status: string): Promise<void> {
  await updatePage(pageId, { Status: { status: { name: status } } });
}

export async function sessaoExiste(pageId: string): Promise<boolean> {
  const p = await getPage(pageId).catch(() => null);
  return p !== null;
}
