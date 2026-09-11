import 'server-only';
import { createPage } from './client';
import { resolverDatabaseId } from './resolver';
import { HANDSOFF, HANDSOFF_SECOES, type HandsoffSecaoKey } from './config';
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

  const children = HANDSOFF_SECOES.map((sec) => {
    const bruto = (dados[sec.key] ?? '').trim();

    if (sec.formato === 'bullets') {
      const itens = bruto
        .split('\n')
        .map((l) => l.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
      return secao(sec.titulo, sec.ajuda, sec.icone, itens.length ? itens.map(bullet) : [paragrafo('')]);
    }

    return secao(sec.titulo, sec.ajuda, sec.icone, [paragrafo(bruto)]);
  });

  const page = await createPage({
    parent: { database_id: dbId },
    properties: {
      // O título nomeia a TUTORA, nunca a mentorada: o registro já vive dentro
      // da área dela, e repetir o nome da mentorada ali só ocupa espaço. Quem
      // olha uma lista de hands-off quer saber quem atendeu.
      [HANDSOFF.nome]: {
        title: [{ type: 'text', text: { content: `Hands-off — Tutora: ${tutora.nome}` } }],
      },
      [HANDSOFF.dataDaSessao]: { date: { start: dados.dataSessao } },
      [HANDSOFF.feitoPelaTutora]: { relation: [{ id: tutora.id }] },
      [HANDSOFF.mentorada]: { relation: [{ id: mentorada.id }] },
    },
    children,
  });

  return { id: page.id, url: page.url };
}
