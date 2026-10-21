import 'server-only';
import {
  appendChildren,
  deleteBlock,
  enviarArquivo,
  getBlock,
  getDatabase,
  getPage,
  queryDatabase,
  type NotionPage,
  type Pai,
} from './client';
import { normalizarId, type Mentorada } from './carteira';
import { resolverDatabaseId } from './resolver';
import { TEMAS_DE_TUTORIA, TUTORIA, ordenarCiclos } from './config';
import { corDaOpcao, data, relationIds, texto, titulo } from './props';
import { nomesDasTutoras } from './tutora';
import { lerBlocos, type BlocoSimples } from './blocks';
import { especialidadesDasTutoras } from './hub';
import { guardado } from './cache';

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
  /** Cada tutora com o id, para a foto (`/api/fotos/tutoras/<id>`). */
  equipe: { id: string; nome: string }[];
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
  /**
   * Partes que dá para editar no app: as que existem na página e só têm texto
   * simples (uma imagem ou tabela lá dentro se perderia ao regravar).
   */
  editaveis: ParteDaSessao[];
};

export type ParteDaSessao = 'resumo' | 'anotacoes' | 'transcricao' | 'gravacao';

/**
 * Maior vídeo que dá para enviar pelo app: o pedido passa pelo servidor, que
 * na hospedagem aceita até 4,5 MB. Gravação de sessão inteira fica no Drive ou
 * no YouTube, com o link aqui.
 */
export const LIMITE_DO_VIDEO = 4 * 1024 * 1024;

/**
 * Todas as sessões da mentorada, de todos os ciclos, com os anos em que ela
 * teve sessões (o mais recente primeiro). Sessão sem ciclo conta no ciclo
 * atual, como no progresso da mentoria.
 */
export async function sessoesPorCiclo(mentorada: Mentorada): Promise<{ ciclos: string[]; sessoes: SessaoDaLista[] }> {
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
  const ciclos = ordenarCiclos([...new Set(sessoes.map((s) => s.ciclo).filter(Boolean))]);
  return { ciclos, sessoes };
}

/**
 * As sessões de um ciclo (por padrão o atual) separadas por
 * pilar, pelas tutorias de cada um. A sessão entra pelo tema (fórmula
 * "Tutoria"); sem tema reconhecido, pela especialidade das tutoras dela.
 */
export async function sessoesDosPilares(
  mentorada: Mentorada,
  pilares: { id: string; tutorias: { nome: string }[] }[],
  /** Ciclo mostrado ("Ciclo 3"); sem ele, o mais recente. */
  cicloPedido?: string,
): Promise<Record<string, SessaoDaLista[]>> {
  const [{ sessoes }, especialidades] = await Promise.all([sessoesPorCiclo(mentorada), especialidadesDasTutoras()]);
  const ciclo = cicloPedido ?? (await cicloMaisRecente());
  const doCiclo = sessoes.filter((s) => s.ciclo === ciclo);

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

/**
 * Todos os ciclos do controle, pelas opções da propriedade `Ciclo` no Notion —
 * e não só aqueles em que a mentorada teve sessão. O mais recente vem primeiro.
 */
export const ciclosDoControle = guardado('ciclos', async (): Promise<string[]> => {
  const schema = await resolverDatabaseId('tutorias').then(getDatabase);
  const prop = Object.values(schema.properties).find((p) => p.name === TUTORIA.ciclo) as
    | { select?: { options: { name: string }[] } }
    | undefined;

  return ordenarCiclos((prop?.select?.options ?? []).map((o) => o.name));
});

/** O ciclo atual: o último criado no controle. */
export async function cicloMaisRecente(): Promise<string> {
  const ciclos = await ciclosDoControle().catch(() => []);
  return ciclos[0] ?? '';
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
): Promise<{ sessao: SessaoDaLista; blocos: BlocoSimples[] } | null> {
  const [pagina, nomes] = await Promise.all([sessaoDaMentorada(mentoradaId, sessaoId), nomesDasTutoras()]);
  if (!pagina) return null;

  // A página inteira, como ela está: cada sessão nasce de um modelo diferente
  // (Terapêutica, Investimentos, Produto…), então o app mostra o que houver lá.
  // Dois níveis bastam (callout -> resposta; as linhas da tabela vêm sempre) e
  // cada nível a mais é uma rodada de idas ao Notion — a sessão abria devagar.
  return { sessao: paraSessao(pagina, nomes), blocos: await lerBlocos(pagina.id, 2) };
}

/**
 * Um bloco de dentro da página de uma sessão desta mentorada — a conferência
 * que toda escrita faz antes de gravar. `null` quando o bloco não é de lá.
 */
export async function blocoDaSessao(mentoradaId: string, sessaoId: string, blocoId: string) {
  const pagina = await sessaoDaMentorada(mentoradaId, sessaoId);
  if (!pagina) return null;

  const bloco = await getBlock(blocoId).catch(() => null);
  if (!bloco) return null;
  return (await moraNaPagina(bloco.parent, pagina.id)) ? bloco : null;
}

/** O bloco pendura nessa página (passando por callouts, colunas, toggles)? */
async function moraNaPagina(pai: Pai | undefined, paginaId: string): Promise<boolean> {
  for (let salto = 0; pai && salto < 8; salto++) {
    if (pai.type === 'page_id') return Boolean(pai.page_id) && normalizarId(pai.page_id!) === normalizarId(paginaId);
    if (pai.type !== 'block_id' || !pai.block_id) return false;
    pai = (await getBlock(pai.block_id).catch(() => null))?.parent;
  }
  return false;
}

/** A página da sessão, só se ela for da base de sessões e estiver ligada a esta mentorada. */
async function sessaoDaMentorada(mentoradaId: string, sessaoId: string): Promise<NotionPage | null> {
  const [pagina, dbId] = await Promise.all([getPage(sessaoId).catch(() => null), resolverDatabaseId('tutorias')]);
  const dona = pagina?.parent?.database_id;
  if (!pagina || !dona || normalizarId(dona) !== normalizarId(dbId)) return null;
  if (!relationIds(pagina, TUTORIA.mentorada).map(normalizarId).includes(normalizarId(mentoradaId))) return null;
  return pagina;
}

/** Valor recusado na edição; a mensagem vai direto para a tela. */
export class SessaoInvalida extends Error {}

/** Distribui os blocos da página nas partes do modelo, pelo título de cada callout. */
function separar(blocos: BlocoSimples[]): ConteudoDaSessao {
  const { conteudo } = separarComAlvos(blocos);
  return conteudo;
}

/** Além do conteúdo, o bloco onde mora cada parte (o callout, ou o toggle da transcrição). */
function separarComAlvos(blocos: BlocoSimples[]): {
  conteudo: ConteudoDaSessao;
  alvos: Partial<Record<ParteDaSessao, BlocoSimples>>;
} {
  const conteudo: ConteudoDaSessao = { resumo: [], anotacoes: [], transcricao: [], gravacao: null, editaveis: [] };
  const alvos: Partial<Record<ParteDaSessao, BlocoSimples>> = {};
  const normal = (t: string) => t.trim().toLowerCase();

  for (const b of blocos) {
    const titulo = normal(b.texto);
    const toggle = b.filhos.find((f) => f.tipo === 'toggle' && normal(f.texto).startsWith('transcrição'));

    if (titulo.startsWith('resumo')) {
      conteudo.resumo = b.filhos;
      alvos.resumo = b;
    } else if (titulo.startsWith('anotações') || titulo.startsWith('anotacoes')) {
      conteudo.anotacoes = b.filhos;
      alvos.anotacoes = b;
    } else if (toggle || titulo.startsWith('transcrição')) {
      conteudo.transcricao = (toggle ?? b).filhos;
      alvos.transcricao = toggle ?? b;
    } else if (titulo.startsWith('gravação') || titulo.startsWith('gravacao')) {
      conteudo.gravacao = acharVideo(b.filhos);
      alvos.gravacao = b;
    }
  }

  // Parte que falta na página (sessão anterior ao modelo) é criada ao salvar.
  conteudo.editaveis = PARTES.filter((parte) => {
    const alvo = alvos[parte];
    return !alvo || parte === 'gravacao' || alvo.filhos.every(textoSimples);
  });
  return { conteudo, alvos };
}

const PARTES: ParteDaSessao[] = ['resumo', 'anotacoes', 'transcricao', 'gravacao'];

/** Os callouts do modelo da sessão, como estão no Notion (a transcrição é um toggle dentro do callout). */
const MODELO: Record<ParteDaSessao, { titulo: string; icone: string }> = {
  resumo: { titulo: 'Resumo da sessão', icone: 'reorder' },
  anotacoes: { titulo: 'Anotações', icone: 'drafts' },
  transcricao: { titulo: 'Transcrição da sessão', icone: 'font' },
  gravacao: { titulo: 'Gravação', icone: 'video-camera' },
};

function tituloDoModelo(texto: string) {
  return [{ type: 'text', text: { content: texto }, annotations: { bold: true, color: 'brown' } }];
}

function calloutDoModelo(parte: ParteDaSessao): unknown {
  const { titulo, icone } = MODELO[parte];
  const transcricao = parte === 'transcricao';
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: transcricao ? [] : tituloDoModelo(titulo),
      icon: { type: 'external', external: { url: `https://www.notion.so/icons/${icone}_brown.svg` } },
      color: 'default_background',
      children: transcricao ? [{ object: 'block', type: 'toggle', toggle: { rich_text: tituloDoModelo(titulo) } }] : [],
    },
  };
}

/** Sessão anterior ao modelo: cria de uma vez, na ordem do modelo, as partes que faltam. */
async function completarModelo(paginaId: string, blocos: BlocoSimples[]): Promise<BlocoSimples[]> {
  const { alvos } = separarComAlvos(blocos);
  const faltam = PARTES.filter((p) => !alvos[p]);
  if (!faltam.length) return blocos;
  await appendChildren(paginaId, faltam.map(calloutDoModelo));
  return lerBlocos(paginaId, 3);
}

/** Blocos que viram linhas de texto e voltam sem perder nada além da formatação. */
const TIPOS_DE_TEXTO = new Set(['paragraph', 'bulleted_list_item', 'numbered_list_item', 'heading_1', 'heading_2', 'heading_3', 'quote', 'to_do']);
function textoSimples(b: BlocoSimples): boolean {
  return TIPOS_DE_TEXTO.has(b.tipo) && b.filhos.length === 0;
}

function paraBlocos(texto: string): unknown[] {
  return texto
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, todas) => l || (i > 0 && todas[i - 1]))
    .map((linha) => {
      const topico = /^[-•]\s+/.test(linha);
      const conteudo = topico ? linha.replace(/^[-•]\s+/, '') : linha;
      // O Notion aceita até 2.000 caracteres por pedaço de texto.
      const partes = conteudo.match(/[\s\S]{1,1900}/g) ?? [];
      const tipo = topico ? 'bulleted_list_item' : 'paragraph';
      return { object: 'block', type: tipo, [tipo]: { rich_text: partes.map((c) => ({ type: 'text', text: { content: c } })) } };
    });
}

function blocoDeVideo(url: string): unknown {
  const video = /(youtube\.com|youtu\.be|vimeo\.com)|\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  return video
    ? { object: 'block', type: 'video', video: { type: 'external', external: { url } } }
    : { object: 'block', type: 'embed', embed: { url } };
}

/**
 * Regrava uma parte da sessão na página dela. Texto: troca os blocos de dentro
 * do callout (ou do toggle da transcrição). Gravação: troca o vídeo pelo link novo
 * (vazio tira o vídeo). `null` se a sessão não for desta mentorada.
 */
export async function salvarParteDaSessao(
  mentoradaId: string,
  sessaoId: string,
  parte: ParteDaSessao,
  valor: string | File,
): Promise<ConteudoDaSessao | null> {
  const pagina = await sessaoDaMentorada(mentoradaId, sessaoId);
  if (!pagina) return null;

  const { conteudo, alvos } = separarComAlvos(await completarModelo(pagina.id, await lerBlocos(pagina.id, 3)));
  const alvo = alvos[parte];
  if (!alvo || !conteudo.editaveis.includes(parte)) throw new SessaoInvalida('Esta parte não pode ser editada por aqui.');
  if (typeof valor !== 'string' && parte !== 'gravacao') throw new SessaoInvalida('Só a gravação aceita arquivo.');
  if (typeof valor === 'string' && valor.length > 100_000) throw new SessaoInvalida('O texto está longo demais.');

  let novos: unknown[];
  let saem: BlocoSimples[];
  if (typeof valor !== 'string') {
    if (!valor.type.startsWith('video/')) throw new SessaoInvalida('Envie um arquivo de vídeo.');
    if (valor.size > LIMITE_DO_VIDEO) throw new SessaoInvalida('O vídeo passa de 4 MB. Coloque no Drive ou no YouTube e cole o link.');
    const id = await enviarArquivo(valor, valor.name || 'gravacao.mp4');
    saem = alvo.filhos.filter((b) => ['video', 'embed', 'bookmark', 'file', 'link_preview'].includes(b.tipo));
    novos = [{ object: 'block', type: 'video', video: { type: 'file_upload', file_upload: { id } } }];
  } else if (parte === 'gravacao') {
    const url = valor.trim();
    if (url && !/^https:\/\/\S+$/.test(url)) throw new SessaoInvalida('Cole um link que comece com https://');
    saem = alvo.filhos.filter((b) => ['video', 'embed', 'bookmark', 'file', 'link_preview'].includes(b.tipo));
    novos = url ? [blocoDeVideo(url)] : [];
  } else {
    saem = alvo.filhos;
    novos = paraBlocos(valor);
  }

  // Primeiro grava o novo, depois apaga o antigo: se algo falhar no meio, sobra
  // conteúdo repetido, nunca conteúdo perdido.
  for (let i = 0; i < novos.length; i += 100) await appendChildren(alvo.id, novos.slice(i, i + 100));
  for (const b of saem) await deleteBlock(b.id);

  return separar(await lerBlocos(pagina.id, 3));
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
    equipe: relationIds(p, TUTORIA.tutoras)
      .map((id) => ({ id, nome: nomes.get(id)?.trim() ?? '' }))
      .filter((t) => t.nome),
    ciclo: texto(p, TUTORIA.ciclo),
    tema: texto(p, TUTORIA.tema),
    mesPrevisto: texto(p, TUTORIA.mesPrevisto),
    dataPrevista: data(p, TUTORIA.dataPrevista),
    dataRealizada: realizada,
  };
}
