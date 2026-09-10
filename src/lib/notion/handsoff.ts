import 'server-only';
import { createPage } from './client';
import { resolverDatabaseId } from './resolver';
import { HANDSOFF, HANDSOFF_SECOES } from './config';
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
  tema: string;
  resumo: string[];
  emocional: string;
  tarefas: string[];
};

function paragrafo(texto: string) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

/** O template do Notion usa callout por seção, com a resposta aninhada dentro. */
function secao(titulo: string, ajuda: string, conteudo: unknown[]) {
  const rotulo = ajuda ? `${titulo} (${ajuda})` : titulo;
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: rotulo } }],
      children: conteudo,
    },
  };
}

function bullet(texto: string) {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [{ type: 'text', text: { content: texto } }] },
  };
}

export async function criarHandsoff(
  mentorada: Mentorada,
  tutoraPageId: string,
  dados: DadosHandsoff,
): Promise<{ id: string; url: string }> {
  const dbId = await resolverDatabaseId('handsoff');

  const valores: Record<string, string[] | string> = {
    tema: dados.tema,
    resumo: dados.resumo,
    emocional: dados.emocional,
    tarefas: dados.tarefas,
  };

  const children = HANDSOFF_SECOES.map((s) => {
    const valor = valores[s.key];
    const conteudo = Array.isArray(valor)
      ? (valor.filter((v) => v.trim()).map(bullet) ?? [])
      : [paragrafo(valor.trim() || '—')];
    return secao(s.titulo, s.ajuda, conteudo.length ? conteudo : [paragrafo('—')]);
  });

  const page = await createPage({
    parent: { database_id: dbId },
    properties: {
      [HANDSOFF.nome]: {
        title: [{ type: 'text', text: { content: `Hands-off — ${mentorada.nome}` } }],
      },
      [HANDSOFF.dataDaSessao]: { date: { start: dados.dataSessao } },
      [HANDSOFF.feitoPelaTutora]: { relation: [{ id: tutoraPageId }] },
      [HANDSOFF.mentorada]: { relation: [{ id: mentorada.id }] },
    },
    children,
  });

  return { id: page.id, url: page.url };
}
