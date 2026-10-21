import 'server-only';
import { cache } from 'react';
import { guardado } from './cache';
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
  /**
   * A foto já reduzida, servida do armazenamento (rápida, sem passar pelo app).
   * `null` se a tutora não tem foto.
   */
  foto: string | null;
  /** A mesma foto pela rota do app: gera e guarda a versão reduzida na primeira vez. */
  fotoDeReserva: string | null;
  especialidades: string[];
  legendaEntregaveis: string;
  topicos: string[];
};

export const tutorasDoHub = cache(
  guardado('hub-tutoras', async (): Promise<TutoraDoHub[]> => {
  const dbId = await resolverDatabaseId('tutoras');
  const linhas = await queryDatabase(dbId, {
    filter: { or: TUTORAS_ATIVAS.map((s) => ({ property: TUTORA.status, status: { equals: s } })) },
    limite: 200,
  });
  return linhas.map(paraTutora).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }),
);

/** Especialidades de todas as tutoras (ativas ou não), por ID normalizado. */
const especialidadesGuardadas = guardado('hub-especialidades', async (): Promise<[string, string[]][]> => {
  const dbId = await resolverDatabaseId('tutoras');
  const linhas = await queryDatabase(dbId, { limite: 300 });
  return linhas.map((p) => [normalizarId(p.id), multi(p, TUTORA.especialidades)]);
});

// O que fica guardado é uma lista: Mapa não sobrevive à ida e volta do cache.
export const especialidadesDasTutoras = cache(
  async (): Promise<Map<string, string[]>> => new Map(await especialidadesGuardadas()),
);

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

/** A Foto da tutora; sem ela, a capa da página. URL assinada do Notion, expira. */
function fotoOriginal(p: NotionPage): string | null {
  return arquivoUrl(p, TUTORA.foto) ?? capaUrl(p);
}

/**
 * A foto original de uma tutora, para a rota que a reduz. `null` se o ID não
 * for de uma tutora (ele vem do navegador) ou se ela não tiver foto.
 */
export async function fotoDaTutora(id: string): Promise<string | null> {
  const [pagina, dbId] = await Promise.all([getPage(id).catch(() => null), resolverDatabaseId('tutoras')]);
  const dona = pagina?.parent?.database_id;
  if (!pagina || !dona || normalizarId(dona) !== normalizarId(dbId)) return null;
  return fotoOriginal(pagina);
}

function paraTutora(p: NotionPage): TutoraDoHub {
  return {
    id: p.id,
    nome: texto(p, TUTORA.nome) || titulo(p),
    foto: fotoOriginal(p) ? fotoGuardada(p.id, p.last_edited_time) : null,
    fotoDeReserva: fotoOriginal(p)
      ? `/api/fotos/tutoras/${p.id}?v=${encodeURIComponent(p.last_edited_time)}`
      : null,
    especialidades: multi(p, TUTORA.especialidades),
    legendaEntregaveis: texto(p, TUTORA.legendaEntregaveis),
    topicos: multi(p, TUTORA.topicos),
  };
}

/**
 * O endereço da foto reduzida no armazenamento. Ela é criada na primeira vez
 * que alguém abre pela rota do app; até lá, o navegador cai na reserva.
 */
function fotoGuardada(tutoraId: string, versao: string): string {
  const caminho = `${normalizarId(tutoraId)}/${versao.replace(/[^\w.-]/g, '')}-card.webp`;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/${caminho}`;
}
