import 'server-only';
import {
  appendChildren,
  createPage,
  deleteBlock,
  getBlockChildren,
  getPage,
  updatePage,
} from './client';
import { resolverDatabaseId } from './resolver';
import { HANDSOFF, HANDSOFF_ICONE, HANDSOFF_SECOES, type HandsoffSecaoKey } from './config';
import type { Mentorada } from './carteira';

/**
 * Cria o Hands-off no Notion — a única escrita que o app faz.
 *
 * A página nasce com o mesmo formato que a tutora já conhece do Notion: um
 * heading por seção, bullets onde o Notion usa bullets. Assim o registro criado
 * pelo app e o criado à mão ficam indistinguíveis.
 */

export type DadosHandsoff = {
  dataSessao: string; // ISO (yyyy-mm-dd)
} & Record<HandsoffSecaoKey, string>;

function paragrafo(texto: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

function bullet(texto: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

/** Callout com ícone nativo do Notion, igual ao template escrito à mão. */
function secao(
  titulo: string,
  ajuda: string,
  icone: string,
  conteudo: unknown[],
) {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: ajuda ? `${titulo} (${ajuda})` : titulo } }],
      icon: { type: 'icon', icon: { name: icone, color: 'brown' } },
      children: conteudo,
    },
  };
}

export async function criarHandsoff(
  mentorada: Mentorada,
  tutora: { id: string; nome: string },
  dados: DadosHandsoff,
): Promise<{ id: string; url: string }> {
  const dbId = await resolverDatabaseId('handsoff');

  const children = HANDSOFF_SECOES.map((sec) =>
    secao(sec.titulo, sec.ajuda, sec.icone, conteudoDaSecao(sec, dados[sec.key] ?? '')),
  );

  const page = await createPage({
    parent: { database_id: dbId },
    icon: { type: 'icon', icon: HANDSOFF_ICONE },
    properties: {
      // O título nomeia a TUTORA, nunca a mentorada: o registro já vive dentro
      // da área dela, e repetir o nome da mentorada ali só ocupa espaço. Quem
      // olha uma lista de hands-off quer saber quem atendeu.
      [HANDSOFF.nome]: {
        title: [{ type: 'text', text: { content: `Hands-off | Tutora: ${tutora.nome}` } }],
      },
      [HANDSOFF.dataDaSessao]: { date: { start: dados.dataSessao } },
      [HANDSOFF.feitoPelaTutora]: { relation: [{ id: tutora.id }] },
      [HANDSOFF.mentorada]: { relation: [{ id: mentorada.id }] },
    },
    children,
  });

  return { id: page.id, url: page.url };
}

/** O rótulo do callout de cada seção, como aparece na página. */
function rotulo(sec: (typeof HANDSOFF_SECOES)[number]): string {
  return sec.ajuda ? `${sec.titulo} (${sec.ajuda})` : sec.titulo;
}

function conteudoDaSecao(sec: (typeof HANDSOFF_SECOES)[number], bruto: string): unknown[] {
  const texto = bruto.trim();
  if (sec.formato !== 'bullets') return [paragrafo(texto)];

  const itens = texto
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  return itens.length ? itens.map(bullet) : [paragrafo('')];
}

export type HandsoffExistente = {
  dataSessao: string;
  secoes: Record<HandsoffSecaoKey, string>;
};

/**
 * Lê um hands-off de volta para o formulário.
 *
 * As seções são casadas pelo texto do callout, não pela posição: um registro
 * escrito à mão pode ter seções fora de ordem, ou uma a menos.
 */
export async function lerHandsoff(pageId: string): Promise<HandsoffExistente> {
  const [page, blocos] = await Promise.all([getPage(pageId), getBlockChildren(pageId)]);

  const secoes = Object.fromEntries(
    HANDSOFF_SECOES.map((s) => [s.key, '']),
  ) as Record<HandsoffSecaoKey, string>;

  for (const sec of HANDSOFF_SECOES) {
    const bloco = blocos.find(
      (b) => b.type === 'callout' && textoDoBloco(b) === rotulo(sec),
    );
    if (!bloco?.has_children) continue;

    const filhos = await getBlockChildren(bloco.id).catch(() => []);
    secoes[sec.key] = filhos
      .map((f) => textoDoBloco(f))
      .filter(Boolean)
      .join('\n');
  }

  const data = page.properties?.[HANDSOFF.dataDaSessao] as
    | { date?: { start?: string } }
    | undefined;

  return { dataSessao: data?.date?.start ?? '', secoes };
}

function textoDoBloco(bloco: { type: string } & Record<string, unknown>): string {
  const conteudo = bloco[bloco.type] as { rich_text?: { plain_text?: string }[] } | undefined;
  return (conteudo?.rich_text ?? [])
    .map((t) => t.plain_text ?? '')
    .join('')
    .trim();
}

/**
 * Regrava um hands-off já existente.
 *
 * Mexe SÓ no que está dentro dos callouts das seções conhecidas: o que a tutora
 * tiver escrito fora deles continua onde está. A API do Notion não troca filhos
 * de um bloco de uma vez, então cada seção é apagada e reescrita — e o apagar do
 * Notion é arquivar, que dá para desfazer pela lixeira.
 */
export async function atualizarHandsoff(
  pageId: string,
  dados: DadosHandsoff,
): Promise<void> {
  await updatePage(pageId, {
    [HANDSOFF.dataDaSessao]: { date: { start: dados.dataSessao } },
  });

  const blocos = await getBlockChildren(pageId);

  for (const sec of HANDSOFF_SECOES) {
    const bloco = blocos.find((b) => b.type === 'callout' && textoDoBloco(b) === rotulo(sec));
    if (!bloco) continue;

    const antigos = bloco.has_children ? await getBlockChildren(bloco.id).catch(() => []) : [];
    for (const antigo of antigos) await deleteBlock(antigo.id).catch(() => {});

    await appendChildren(bloco.id, conteudoDaSecao(sec, dados[sec.key] ?? ''));
  }
}
