import 'server-only';
import { getPage, queryDatabase, type NotionPage } from './client';
import { normalizarId, type Mentorada } from './carteira';
import { resolverDatabaseId } from './resolver';
import { TUTORIA, cicloAtual } from './config';
import { data, relationIds, texto, titulo } from './props';
import { nomesDasTutoras } from './tutora';
import { lerBlocos, type BlocoSimples } from './blocks';

/**
 * As sessões da mentorada, da base "Acompanhamento de clientes" — a mesma do
 * progresso da mentoria, com o mesmo recorte (ciclo atual e sessões sem ciclo).
 * Somente leitura.
 *
 * O conteúdo de cada sessão segue o modelo do Notion: callouts "Resumo da
 * sessão", "Anotações", um toggle "Transcrição da sessão", "Tarefas" e
 * "Gravação" (bloco de vídeo). É lido só quando a sessão é aberta.
 */

export type SessaoDaLista = {
  id: string;
  sessao: string;
  status: string;
  /** "2026-09-20": a realizada, se houver; senão a prevista. */
  data: string | null;
  realizada: boolean;
  tutoras: string[];
  ciclo: string;
};

export type ConteudoDaSessao = {
  resumo: BlocoSimples[];
  anotacoes: BlocoSimples[];
  transcricao: BlocoSimples[];
  gravacao: string | null;
};

export async function sessoesDaMentorada(mentorada: Mentorada): Promise<SessaoDaLista[]> {
  const dbId = await resolverDatabaseId('tutorias');
  const ciclo = cicloAtual();
  const [linhas, nomes] = await Promise.all([
    queryDatabase(dbId, {
      filter: {
        and: [
          { or: mentorada.areaDaClienteIds.map((id) => ({ property: TUTORIA.mentorada, relation: { contains: id } })) },
          {
            or: [
              { property: TUTORIA.ciclo, select: { equals: ciclo } },
              { property: TUTORIA.ciclo, select: { is_empty: true } },
            ],
          },
        ],
      },
      limite: 500,
    }),
    nomesDasTutoras(),
  ]);

  return linhas
    .map((p) => paraSessao(p, nomes))
    // Por data; sem data vai para o fim, na ordem do nome.
    .sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999') || a.sessao.localeCompare(b.sessao, 'pt-BR'));
}

/**
 * Conteúdo de uma sessão. `null` se o ID não for de uma sessão desta mentorada
 * (os dois IDs vêm do navegador).
 */
export async function conteudoDaSessao(
  mentoradaId: string,
  sessaoId: string,
): Promise<{ sessao: SessaoDaLista; conteudo: ConteudoDaSessao } | null> {
  const [pagina, dbId, nomes] = await Promise.all([
    getPage(sessaoId).catch(() => null),
    resolverDatabaseId('tutorias'),
    nomesDasTutoras(),
  ]);
  const dona = pagina?.parent?.database_id;
  if (!pagina || !dona || normalizarId(dona) !== normalizarId(dbId)) return null;
  if (!relationIds(pagina, TUTORIA.mentorada).map(normalizarId).includes(normalizarId(mentoradaId))) return null;

  const blocos = await lerBlocos(pagina.id, 3);
  return { sessao: paraSessao(pagina, nomes), conteudo: separar(blocos) };
}

/** Distribui os blocos da página nas partes do modelo, pelo título de cada callout. */
function separar(blocos: BlocoSimples[]): ConteudoDaSessao {
  const conteudo: ConteudoDaSessao = { resumo: [], anotacoes: [], transcricao: [], gravacao: null };
  const normal = (t: string) => t.trim().toLowerCase();

  for (const b of blocos) {
    const titulo = normal(b.texto);
    const toggle = b.filhos.find((f) => f.tipo === 'toggle' && normal(f.texto).startsWith('transcrição'));

    if (titulo.startsWith('resumo')) conteudo.resumo = b.filhos;
    else if (titulo.startsWith('anotações') || titulo.startsWith('anotacoes')) conteudo.anotacoes = b.filhos;
    else if (toggle || titulo.startsWith('transcrição')) conteudo.transcricao = (toggle ?? b).filhos;
    else if (titulo.startsWith('gravação') || titulo.startsWith('gravacao')) {
      conteudo.gravacao = acharVideo(b.filhos);
    }
  }
  return conteudo;
}

function acharVideo(blocos: BlocoSimples[]): string | null {
  for (const b of blocos) {
    if ((b.tipo === 'video' || b.tipo === 'embed' || b.tipo === 'bookmark' || b.tipo === 'file') && b.url) return b.url;
    const dentro = acharVideo(b.filhos);
    if (dentro) return dentro;
  }
  return null;
}

function paraSessao(p: NotionPage, nomes: Map<string, string>): SessaoDaLista {
  const realizada = data(p, TUTORIA.dataRealizada);
  const status = texto(p, TUTORIA.status);
  return {
    id: p.id,
    sessao: texto(p, TUTORIA.sessao) || titulo(p),
    status,
    data: realizada ?? data(p, TUTORIA.dataPrevista),
    realizada: status === 'Realizada',
    tutoras: relationIds(p, TUTORIA.tutoras)
      .map((id) => nomes.get(id)?.trim())
      .filter((n): n is string => Boolean(n)),
    ciclo: texto(p, TUTORIA.ciclo),
  };
}
