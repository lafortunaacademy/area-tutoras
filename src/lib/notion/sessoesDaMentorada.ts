import 'server-only';
import { getPage, queryDatabase, type NotionPage } from './client';
import { normalizarId, type Mentorada } from './carteira';
import { resolverDatabaseId } from './resolver';
import { TEMAS_DE_TUTORIA, TUTORIA, cicloAtual } from './config';
import { corDaOpcao, data, relationIds, texto, titulo } from './props';
import { nomesDasTutoras } from './tutora';
import { lerBlocos, type BlocoSimples } from './blocks';
import { especialidadesDasTutoras } from './hub';

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
  /** Cor da opção de Status no Notion, para a etiqueta sair igual. */
  corStatus: string;
  /** "2026-09-20": a realizada, se houver; senão a prevista. */
  data: string | null;
  realizada: boolean;
  tutoras: string[];
  tutoraIds: string[];
  ciclo: string;
  /** Tema pela fórmula "Tutoria" ("Produto", "Conteúdo"…). */
  tema: string;
  mesPrevisto: string;
  dataPrevista: string | null;
  dataRealizada: string | null;
};

export type ConteudoDaSessao = {
  resumo: BlocoSimples[];
  anotacoes: BlocoSimples[];
  transcricao: BlocoSimples[];
  gravacao: string | null;
};

/**
 * Todas as sessões da mentorada, de todos os ciclos, com os anos em que ela
 * teve sessões (o mais recente primeiro). Sessão sem ciclo conta no ciclo
 * atual, como no progresso da mentoria.
 */
export async function sessoesPorCiclo(mentorada: Mentorada): Promise<{ anos: string[]; sessoes: SessaoDaLista[] }> {
  const dbId = await resolverDatabaseId('tutorias');
  const [linhas, nomes] = await Promise.all([
    queryDatabase(dbId, {
      filter: {
        or: mentorada.areaDaClienteIds.map((id) => ({ property: TUTORIA.mentorada, relation: { contains: id } })),
      },
      limite: 1000,
    }),
    nomesDasTutoras(),
  ]);

  const sessoes = ordenar(linhas.map((p) => paraSessao(p, nomes)));
  const anos = [...new Set(sessoes.map(anoDaSessao))].sort((a, b) => b.localeCompare(a));
  return { anos, sessoes };
}

/**
 * As sessões do ciclo atual (as mesmas do progresso da mentoria) separadas por
 * pilar, pelas tutorias de cada um. A sessão entra pelo tema (fórmula
 * "Tutoria"); sem tema reconhecido, pela especialidade das tutoras dela.
 */
export async function sessoesDosPilares(
  mentorada: Mentorada,
  pilares: { id: string; tutorias: { nome: string }[] }[],
): Promise<Record<string, SessaoDaLista[]>> {
  const [{ sessoes }, especialidades] = await Promise.all([sessoesPorCiclo(mentorada), especialidadesDasTutoras()]);
  const ano = cicloAtual().match(/\d{4}/)?.[0];
  const doCiclo = sessoes.filter((s) => anoDaSessao(s) === ano);

  const temasDoPilar = (p: (typeof pilares)[number]) =>
    TEMAS_DE_TUTORIA.filter((t) => p.tutorias.some((tu) => semAcento(tu.nome).includes(t.trecho)));
  const todosOsTemas = new Set(TEMAS_DE_TUTORIA.flatMap((t) => t.temas.map(semAcento)));

  const resultado: Record<string, SessaoDaLista[]> = {};
  for (const p of pilares) {
    const temas = temasDoPilar(p);
    const nomes = new Set(temas.flatMap((t) => t.temas.map(semAcento)));
    const areas = new Set(temas.flatMap((t) => t.especialidades.map(semAcento)));
    resultado[p.id] = doCiclo.filter((s) =>
      todosOsTemas.has(semAcento(s.tema))
        ? nomes.has(semAcento(s.tema))
        : s.tutoraIds.some((id) => (especialidades.get(normalizarId(id)) ?? []).some((e) => areas.has(semAcento(e)))),
    );
  }
  return resultado;
}

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/** "2026", tirado de "Ciclo 2026"; sem ciclo, o ano do ciclo atual. */
export function anoDaSessao(s: SessaoDaLista): string {
  return (s.ciclo || cicloAtual()).match(/\d{4}/)?.[0] ?? s.ciclo;
}

function ordenar(sessoes: SessaoDaLista[]): SessaoDaLista[] {
  return sessoes
    // Como no Notion: primeiro as realizadas, depois as a realizar; dentro de
    // cada grupo, pelo nome ("[1] Planejamento…", "Call SOS…", "Check-in…", "Tutoria 01…").
    .sort((a, b) => ordemDoStatus(a.status) - ordemDoStatus(b.status) || compararNomes(a.sessao, b.sessao));
}

const ORDEM_STATUS = ['Realizada', 'A realizar'];
function ordemDoStatus(status: string): number {
  const i = ORDEM_STATUS.indexOf(status);
  return i === -1 ? ORDEM_STATUS.length : i;
}

function compararNomes(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
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
    corStatus: corDaOpcao(p, TUTORIA.status),
    data: realizada ?? data(p, TUTORIA.dataPrevista),
    realizada: status === 'Realizada',
    tutoras: relationIds(p, TUTORIA.tutoras)
      .map((id) => nomes.get(id)?.trim())
      .filter((n): n is string => Boolean(n)),
    tutoraIds: relationIds(p, TUTORIA.tutoras),
    ciclo: texto(p, TUTORIA.ciclo),
    tema: texto(p, TUTORIA.tema),
    mesPrevisto: texto(p, TUTORIA.mesPrevisto),
    dataPrevista: data(p, TUTORIA.dataPrevista),
    dataRealizada: realizada,
  };
}
