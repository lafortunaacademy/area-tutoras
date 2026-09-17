import 'server-only';
import { cache } from 'react';
import { getPage, queryDatabase, type NotionPage } from './client';
import { normalizarId } from './carteira';
import { resolverDatabaseId } from './resolver';
import { TUTORA, TUTORAS_ATIVAS } from './config';
import { arquivoUrl, capaUrl, texto, titulo } from './props';
import { lerBlocos, type BlocoSimples } from './blocks';

/**
 * "Tutorias do HUB": a galeria das tutoras na página Tutorias da área de
 * membros. No Notion é uma visualização da base Tutoras (a mesma de todas as
 * mentoradas), só com as ativas e em ordem alfabética. Somente leitura no app.
 */

export type TutoraDoHub = {
  id: string;
  nome: string;
  /** A capa do cartão: a Foto da tutora; sem ela, a capa da página. URL assinada, expira. */
  foto: string | null;
  especialidades: string[];
  legendaEntregaveis: string;
  topicos: string[];
};

export const tutorasDoHub = cache(async (): Promise<TutoraDoHub[]> => {
  const dbId = await resolverDatabaseId('tutoras');
  const linhas = await queryDatabase(dbId, {
    filter: { or: TUTORAS_ATIVAS.map((s) => ({ property: TUTORA.status, status: { equals: s } })) },
    limite: 200,
  });
  return linhas.map(paraTutora).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
});

/**
 * Uma tutora com o conteúdo da página dela. `null` se o ID não for de uma
 * tutora (ele vem do navegador).
 */
export async function tutoraDoHub(id: string): Promise<{ tutora: TutoraDoHub; blocos: BlocoSimples[] } | null> {
  const [pagina, dbId] = await Promise.all([getPage(id).catch(() => null), resolverDatabaseId('tutoras')]);
  const dona = pagina?.parent?.database_id;
  if (!pagina || !dona || normalizarId(dona) !== normalizarId(dbId)) return null;
  // Nenhuma imagem entra no cartão: a foto da tutora já está no topo dele, e a
  // imagem do fim da página é só a marca da La Fortuna.
  const blocos = semImagens(await lerBlocos(pagina.id, 3));
  return { tutora: paraTutora(pagina), blocos };
}

function semImagens(blocos: BlocoSimples[]): BlocoSimples[] {
  return blocos.filter((b) => b.tipo !== 'image').map((b) => ({ ...b, filhos: semImagens(b.filhos) }));
}

function multi(p: NotionPage, nome: string): string[] {
  const prop = p.properties?.[nome];
  if (prop?.type !== 'multi_select') return [];
  return ((prop.multi_select as { name: string }[]) ?? []).map((o) => o.name);
}

function paraTutora(p: NotionPage): TutoraDoHub {
  return {
    id: p.id,
    nome: texto(p, TUTORA.nome) || titulo(p),
    foto: arquivoUrl(p, TUTORA.foto) ?? capaUrl(p),
    especialidades: multi(p, TUTORA.especialidades),
    legendaEntregaveis: texto(p, TUTORA.legendaEntregaveis),
    topicos: multi(p, TUTORA.topicos),
  };
}
