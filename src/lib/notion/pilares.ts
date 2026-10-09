import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  appendChildren,
  createPage,
  getBlock,
  getBlockChildren,
  getDatabase,
  getPage,
  NotionError,
  queryDatabase,
  enviarArquivo,
  updateBlock,
  type NotionBlock,
  type NotionPage,
  type Pai,
} from './client';
import { lerBlocos, type BlocoSimples, type IconeNotion, type ItemDeMaterial } from './blocks';
import { AREA_DE_MEMBROS, TEMAS_DE_TUTORIA } from './config';
import { normalizarId, type Mentorada } from './carteira';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { especialidadesDasTutoras } from './hub';
import { titulo } from './props';
import { sessoesPorCiclo, type SessaoDaLista } from './sessoesDaMentorada';

/**
 * Os pilares da página Tutorias da mentorada (Líder, Dinheiro, Negócio), cada
 * um com a frase e as tutorias dele. Somente leitura.
 *
 * O Notion aceita dois jeitos, e os dois valem:
 * - novo: título "Pilar: …", a frase e, num callout, um toggle por tutoria
 *   ("Tutorias terapêuticas") com os callouts dela dentro;
 * - antigo: callout "Pilar: …" com a frase e uma base de cartões, cada cartão
 *   uma página com os mesmos callouts dentro.
 * Nos callouts de cada tutoria, a base comum vira galeria de materiais e a de
 * "Sessões…" (uma visualização da base de sessões) vira a tabela das sessões
 * da mentorada naquele tema.
 */

export type { IconeNotion, ItemDeMaterial } from './blocks';

export type ParteDaTutoria =
  | { tipo: 'materiais'; id: string; titulo: string; icone: IconeNotion; itens: ItemDeMaterial[] }
  | { tipo: 'sessoes'; id: string; titulo: string; icone: IconeNotion; sessoes: SessaoDaLista[] };

export type TutoriaDoPilar = { id: string; titulo: string; icone: IconeNotion; partes: ParteDaTutoria[] };

export type Pilar = {
  id: string;
  titulo: string;
  icone: IconeNotion;
  /** A frase do pilar, com o trecho em negrito separado. */
  frase: { texto: string; negrito: boolean }[];
  tutorias: TutoriaDoPilar[];
};

type RichText = { plain_text?: string; annotations?: { bold?: boolean } };

type Contexto = { sessoes: SessaoDaLista[]; especialidades: Map<string, string[]> };

const chave = (mentoradaId: string) => `tutorias-pagina:${mentoradaId}`;

export async function pilaresDaMentorada(mentorada: Mentorada): Promise<Pilar[] | null> {
  const pagina = await paginaDeTutorias(mentorada.id);
  if (!pagina) return null;

  const [blocos, todas, especialidades] = await Promise.all([
    getBlockChildren(pagina).catch(async (erro) => {
      const sumiu = erro instanceof NotionError && (erro.status === 404 || erro.code === 'object_not_found');
      if (!sumiu) throw erro;
      const nova = await paginaDeTutorias(mentorada.id, true);
      return nova ? getBlockChildren(nova) : [];
    }),
    sessoesPorCiclo(mentorada),
    especialidadesDasTutoras(),
  ]);
  const ctx: Contexto = { sessoes: todas.sessoes, especialidades };

  // Primeiro monta o esqueleto (quem é pilar, frase, onde está cada tutoria);
  // depois lê as tutorias todas em paralelo.
  const esqueleto: { pilar: Omit<Pilar, 'tutorias'>; fontes: FonteDeTutoria[] }[] = [];
  const atual = () => esqueleto[esqueleto.length - 1];
  const novoPilar = (id: string, titulo: string, icone: IconeNotion) =>
    esqueleto.push({ pilar: { id, titulo, icone, frase: [] }, fontes: [] });

  const visitar = async (lista: NotionBlock[], iconeDoCallout: IconeNotion) => {
    for (const b of lista) {
      const texto = juntar(conteudo(b).rich_text);
      const ehTituloDePilar = /^pilar\b/i.test(texto) && !b.type.startsWith('toggle') && !conteudo(b).is_toggleable;

      if (b.type === 'callout') {
        if (ehCallout(b, AREA_DE_MEMBROS.calloutHub)) continue;
        const icone = iconeDe((b.callout as { icon?: unknown })?.icon);
        if (ehTituloDePilar) novoPilar(b.id, texto, icone);
        if (b.has_children) await visitar(await getBlockChildren(b.id), icone);
      } else if (ehTituloDePilar) {
        novoPilar(b.id, texto, iconeDoCallout);
      } else if (!atual()) {
        continue;
      } else if (b.type === 'quote' && !atual().pilar.frase.length) {
        atual().pilar.frase = (conteudo(b).rich_text ?? [])
          .map((t) => ({ texto: t.plain_text ?? '', negrito: Boolean(t.annotations?.bold) }))
          .filter((t) => t.texto);
      } else if (b.type === 'toggle' || (b.type.startsWith('heading') && conteudo(b).is_toggleable)) {
        if (texto) atual().fontes.push({ id: b.id, titulo: semTutoria(texto), icone: null });
      } else if (b.type === 'child_database') {
        // Jeito antigo: cada cartão da base é uma tutoria.
        const cartoes = await queryDatabase(b.id, { limite: 50 }).catch(() => []);
        for (const c of cartoes) {
          const nome = titulo(c).split('|')[0].trim();
          if (nome) atual().fontes.push({ id: c.id, titulo: semTutoria(nome), icone: iconeDe(c.icon) });
        }
      }
    }
  };
  await visitar(blocos, null);

  return Promise.all(
    esqueleto.map(async ({ pilar, fontes }) => {
      const frase = pilar.frase.map((t) => t.texto).join('').toLowerCase();
      const ordenadas = [...fontes].sort(
        (a, b) => posicaoNaFrase(a.titulo, frase) - posicaoNaFrase(b.titulo, frase),
      );
      return { ...pilar, tutorias: await Promise.all(ordenadas.map((f) => lerTutoria(f, ctx))) };
    }),
  );
}

/**
 * Conteúdo de um material (Pré-sessão, Carteira de investimentos…). O ID vem do
 * navegador: só devolve se a página estiver dentro da página Tutorias desta
 * mentorada, subindo a árvore pelos pais.
 */
export async function materialDaMentorada(
  mentoradaId: string,
  paginaId: string,
): Promise<{ titulo: string; blocos: BlocoSimples[] } | null> {
  const [tutorias, pagina] = await Promise.all([paginaDeTutorias(mentoradaId), getPage(paginaId).catch(() => null)]);
  if (!tutorias || !pagina || !(await desceDe(pagina.parent, tutorias))) return null;

  const blocos = await comAsBasesDeDentro(await lerBlocos(pagina.id, 3));
  return { titulo: titulo(pagina).split('|')[0].trim(), blocos };
}

/** Pré-sessões são os únicos materiais que a mentorada preenche. */
export /** "Tutorias terapêuticas" -> "Terapêuticas"; "Tutoria Investimentos" -> "Investimentos". */
function semTutoria(titulo: string): string {
  const limpo = titulo.replace(/^tutorias?\s+(de\s+|do\s+|da\s+)?/i, '').trim() || titulo.trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

export const ehPreSessao = (t: string) => /^pre[-\s]?sessao/.test(normal(t));

export type RespostaDaPreSessao =
  | { acao: 'marcar'; blocoId: string; marcado: boolean }
  | { acao: 'texto'; blocoId: string; texto: string }
  /** Pergunta ainda sem parágrafo de resposta: cria um dentro do callout. */
  | { acao: 'adicionar'; blocoId: string; texto: string }
  /** Uma linha inteira de uma tabela da página (carteira de investimentos…). */
  | { acao: 'linhaDaTabela'; blocoId: string; celulas: string[] }
  /** Mais uma linha vazia no fim de uma tabela. */
  | { acao: 'linha'; blocoId: string };

/**
 * Grava uma resposta na pré-sessão, direto no Notion. Os IDs vêm do navegador:
 * a página precisa ser uma pré-sessão dentro da página Tutorias desta mentorada,
 * e o bloco precisa morar nessa página — e ser do tipo que a ação espera.
 * Devolve o ID do bloco escrito (o novo, quando cria).
 */
export async function responderPreSessao(
  mentoradaId: string,
  paginaId: string,
  resposta: RespostaDaPreSessao,
): Promise<string | null> {
  const bloco = await blocoDaPreSessao(mentoradaId, paginaId, resposta.blocoId);
  if (!bloco) return null;

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

/**
 * Anexa um arquivo dentro de uma pergunta (callout) da pré-sessão: imagem vira
 * bloco de imagem, PDF de PDF, o resto de arquivo. Mesmas conferências de
 * `responderPreSessao`. Devolve o bloco criado, já no formato da tela.
 */
export async function anexarNaPreSessao(
  mentoradaId: string,
  paginaId: string,
  calloutId: string,
  arquivo: File,
): Promise<BlocoSimples | null> {
  const callout = await blocoDaPreSessao(mentoradaId, paginaId, calloutId);
  if (!callout || callout.type !== 'callout') return null;

  const upload = await enviarArquivo(arquivo, arquivo.name);
  const tipo = arquivo.type.startsWith('image/') ? 'image' : arquivo.type === 'application/pdf' ? 'pdf' : 'file';
  const [novo] = await appendChildren(callout.id, [
    { object: 'block', type: tipo, [tipo]: { type: 'file_upload', file_upload: { id: upload } } },
  ]);
  if (!novo) return null;
  const conteudo = novo[tipo] as { file?: { url: string } } | undefined;
  return { id: novo.id, tipo, texto: '', url: conteudo?.file?.url, legenda: arquivo.name, filhos: [] };
}

/**
 * Cria uma página nova a partir de uma que já existe na mesma base — é o que os
 * botões "Nova pré-sessão" e "Nova carteira de investimentos" fazem no Notion.
 *
 * A API não enxerga o modelo do botão de lá, então o modelo é a própria página:
 * copiamos a estrutura (seções, perguntas, opções, tabela) com os mesmos ícones
 * e cores, e deixamos tudo em branco — resposta escrita, opção marcada e linha
 * preenchida não vão junto.
 */
export async function copiarPaginaDaTutoria(
  mentoradaId: string,
  modeloId: string,
): Promise<ItemDeMaterial | null> {
  const [tutorias, modelo] = await Promise.all([paginaDeTutorias(mentoradaId), getPage(modeloId).catch(() => null)]);
  if (!tutorias || !modelo || !(await desceDe(modelo.parent, tutorias))) return null;

  const baseId = modelo.parent?.database_id;
  if (!baseId) return null;

  const nome = titulo(modelo);
  const filhos = await emBranco(await getBlockChildren(modelo.id), 2);

  const nova = await createPage({
    parent: { database_id: baseId },
    // Mesmo ícone do modelo: é o padrão que a Fernanda escolheu no Notion.
    icon: modelo.icon,
    properties: { [propriedadeDoTitulo(modelo)]: { title: [{ type: 'text', text: { content: nome } }] } },
    children: filhos,
  });

  return { id: nova.id, titulo: nome, icone: iconeDe(nova.icon), criadaEm: nova.created_time ?? null };
}

/** O nome da propriedade de título da base (quase sempre "Nome"). */
function propriedadeDoTitulo(pagina: NotionPage): string {
  const achada = Object.entries(pagina.properties ?? {}).find(([, p]) => (p as { type?: string }).type === 'title');
  return achada?.[0] ?? 'Nome';
}

const SO_LEITURA = new Set(['child_database', 'child_page', 'unsupported', 'link_to_page', 'template', 'synced_block']);

/**
 * Copia os blocos do modelo sem o que já foi respondido: parágrafo dentro de
 * pergunta sai vazio, opção vem desmarcada e a tabela fica só com o cabeçalho
 * e uma linha em branco.
 */
async function emBranco(blocos: NotionBlock[], profundidade: number): Promise<unknown[]> {
  const copias: unknown[] = [];

  for (const b of blocos) {
    if (SO_LEITURA.has(b.type)) continue;
    const corpo = conteudo(b) as Record<string, unknown>;

    if (b.type === 'table') {
      const linhas = b.has_children ? await getBlockChildren(b.id).catch(() => []) : [];
      const largura = Number(corpo.table_width ?? linhas[0] ? ((linhas[0]?.table_row as { cells?: unknown[] })?.cells?.length ?? 0) : 0) || 1;
      const cabecalho = corpo.has_column_header && linhas[0] ? [{ object: 'block', type: 'table_row', table_row: { cells: ((linhas[0].table_row as { cells?: unknown[][] }).cells ?? []) } }] : [];
      copias.push({
        object: 'block',
        type: 'table',
        table: {
          table_width: largura,
          has_column_header: Boolean(corpo.has_column_header),
          has_row_header: Boolean(corpo.has_row_header),
          children: [...cabecalho, { object: 'block', type: 'table_row', table_row: { cells: Array.from({ length: largura }, () => []) } }],
        },
      });
      continue;
    }

    if (b.type === 'paragraph' && !ehPergunta(juntar(corpo.rich_text as RichText[] | undefined))) {
      // Resposta antiga: entra vazia, para a pergunta nascer em branco.
      copias.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [] } });
      continue;
    }

    const novo: Record<string, unknown> = { rich_text: corpo.rich_text ?? [] };
    if (corpo.icon) novo.icon = corpo.icon;
    if (corpo.color) novo.color = corpo.color;
    if (b.type === 'to_do') novo.checked = false;
    if (b.type === 'code') novo.language = corpo.language ?? 'plain text';

    if (b.has_children && profundidade > 0) {
      const dentro = await emBranco(await getBlockChildren(b.id).catch(() => []), profundidade - 1);
      if (dentro.length) novo.children = dentro;
    }

    copias.push({ object: 'block', type: b.type, [b.type]: novo });
  }

  return copias;
}

/** Parágrafo que termina em "?" ou ":" é parte da pergunta, não resposta. */
const ehPergunta = (t: string) => /[?:]\s*$/.test(t.trim());

/** O bloco, se ele mora numa página dentro da página Tutorias desta mentorada. */
async function blocoDaPreSessao(mentoradaId: string, paginaId: string, blocoId: string) {
  const [tutorias, pagina, bloco] = await Promise.all([
    paginaDeTutorias(mentoradaId),
    getPage(paginaId).catch(() => null),
    getBlock(blocoId).catch(() => null),
  ]);
  if (!tutorias || !pagina || !bloco) return null;
  if (!(await blocoDaPagina(bloco.parent, pagina.id)) || !(await desceDe(pagina.parent, tutorias))) return null;
  return bloco;
}

/** O Notion aceita até 2.000 caracteres por pedaço de texto. */
function textoRico(texto: string) {
  const pedacos = texto.match(/[\s\S]{1,2000}/g) ?? [];
  return pedacos.slice(0, 100).map((content) => ({ type: 'text', text: { content } }));
}

/** O bloco mora dentro da página (subindo por callouts, colunas, toggles), sem passar por outra página. */
async function blocoDaPagina(pai: Pai | undefined, paginaId: string): Promise<boolean> {
  for (let salto = 0; pai && salto < 8; salto++) {
    if (pai.type === 'page_id') return Boolean(pai.page_id) && normalizarId(pai.page_id!) === normalizarId(paginaId);
    if (pai.type !== 'block_id' || !pai.block_id) return false;
    pai = (await getBlock(pai.block_id).catch(() => null))?.parent;
  }
  return false;
}

/**
 * Dentro de um material o Notion costuma pendurar outras bases ("Tutorias de
 * conteúdo", "Imagem e estilo"…). A API não devolve as linhas junto com o
 * bloco, então cada uma é consultada aqui — visualização vinculada não abre e
 * fica de fora.
 */
async function comAsBasesDeDentro(blocos: BlocoSimples[]): Promise<BlocoSimples[]> {
  const lidos = await Promise.all(
    blocos.map(async (b) => {
      const filhos = await comAsBasesDeDentro(b.filhos);
      if (b.tipo !== 'child_database') return { ...b, filhos };

      const linhas = await queryDatabase(b.id, { limite: 100 }).catch(() => null);
      const itens: ItemDeMaterial[] = (linhas ?? [])
        .map((p) => ({ id: p.id, titulo: titulo(p).split('|')[0].trim(), icone: iconeDe(p.icon), criadaEm: p.created_time ?? null }))
        .filter((i) => i.titulo)
        .sort((a, b2) => Number(!ehPreSessao(a.titulo)) - Number(!ehPreSessao(b2.titulo)) || a.titulo.localeCompare(b2.titulo, 'pt-BR'));
      return { ...b, filhos, itens };
    }),
  );
  // Callout que só guarda uma visualização vinculada (as "Sessões" de cada
  // tutoria, que já estão na página Sessões) ficaria vazio: sai.
  const vazio = (b: BlocoSimples) =>
    b.tipo === 'unsupported' || (b.tipo === 'child_database' && !b.itens?.length);
  return lidos.filter((b) => !(b.tipo === 'callout' && b.filhos.length > 0 && b.filhos.every(vazio)));
}

async function desceDe(pai: Pai | undefined, raiz: string): Promise<boolean> {
  // Material -> base -> callout -> toggle -> callout -> página Tutorias: poucos saltos.
  for (let salto = 0; pai && salto < 16; salto++) {
    if (pai.type === 'page_id' && pai.page_id) {
      if (normalizarId(pai.page_id) === normalizarId(raiz)) return true;
      pai = (await getPage(pai.page_id).catch(() => null))?.parent;
    } else if (pai.type === 'database_id' && pai.database_id) {
      pai = (await getDatabase(pai.database_id).catch(() => null))?.parent;
    } else if (pai.type === 'block_id' && pai.block_id) {
      pai = (await getBlock(pai.block_id).catch(() => null))?.parent;
    } else {
      return false;
    }
  }
  return false;
}

type FonteDeTutoria = { id: string; titulo: string; icone: IconeNotion };

async function lerTutoria(fonte: FonteDeTutoria, ctx: Contexto): Promise<TutoriaDoPilar> {
  const callouts = (await getBlockChildren(fonte.id).catch(() => [])).filter((b) => b.type === 'callout' && b.has_children);

  const partes = await Promise.all(
    callouts.map(async (callout): Promise<ParteDaTutoria | null> => {
      const filhos = await getBlockChildren(callout.id);
      const base = filhos.find((b) => b.type === 'child_database');
      if (!base) return null;

      const paragrafo = filhos.find((b) => b.type === 'paragraph' && juntar(conteudo(b).rich_text));
      const tituloDaParte =
        juntar(conteudo(callout).rich_text) || (paragrafo ? juntar(conteudo(paragrafo).rich_text) : '') || (base.child_database as { title?: string })?.title?.trim() || '';
      const icone = iconeDe((callout.callout as { icon?: unknown })?.icon);

      if (normal(tituloDaParte).startsWith('sessoes')) {
        return { tipo: 'sessoes', id: callout.id, titulo: tituloDaParte, icone, sessoes: sessoesDoTema(fonte.titulo, ctx) };
      }

      const linhas = await queryDatabase(base.id, { limite: 50 }).catch(() => null);
      if (!linhas) return null;
      return {
        tipo: 'materiais',
        id: callout.id,
        titulo: tituloDaParte,
        icone,
        itens: linhas
          .map((p) => ({ id: p.id, titulo: titulo(p).split('|')[0].trim(), icone: iconeDe(p.icon), criadaEm: p.created_time ?? null }))
          .filter((i) => i.titulo)
          // A pré-sessão vem antes de tudo, como no Notion; o resto em ordem alfabética.
          .sort((a, b) => Number(!ehPreSessao(a.titulo)) - Number(!ehPreSessao(b.titulo)) || a.titulo.localeCompare(b.titulo, 'pt-BR')),
      };
    }),
  );

  return { ...fonte, partes: partes.filter((p): p is ParteDaTutoria => p !== null) };
}

/** As sessões da mentorada no tema da tutoria, na ordem da visualização do Notion. */
function sessoesDoTema(tituloDaTutoria: string, ctx: Contexto): SessaoDaLista[] {
  const tema = TEMAS_DE_TUTORIA.find((t) => normal(tituloDaTutoria).includes(t.trecho));
  if (!tema) return [];
  const temas = new Set(tema.temas.map(normal));
  const especialidades = new Set(tema.especialidades.map(normal));

  return ctx.sessoes
    .filter(
      (s) =>
        temas.has(normal(s.tema)) ||
        s.tutoraIds.some((id) => (ctx.especialidades.get(normalizarId(id)) ?? []).some((e) => especialidades.has(normal(e)))),
    )
    .sort(
      (a, b) =>
        ordemDoMes(a.mesPrevisto) - ordemDoMes(b.mesPrevisto) ||
        (a.dataRealizada ?? '9999').localeCompare(b.dataRealizada ?? '9999') ||
        a.sessao.localeCompare(b.sessao, 'pt-BR', { numeric: true }),
    );
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function ordemDoMes(mes: string): number {
  if (!mes) return 99;
  const numero = mes.match(/\d{1,2}/);
  if (numero && Number(numero[0]) >= 1 && Number(numero[0]) <= 12) return Number(numero[0]);
  const i = MESES.findIndex((m) => normal(mes).includes(m));
  return i === -1 ? 98 : i + 1;
}

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * A ordem dos cartões segue a frase do pilar ("produto, posicionamento,
 * processos e pessoas"), que é a ordem do Notion; o que a frase não cita vai
 * para o fim.
 */
function posicaoNaFrase(tituloDoCartao: string, frase: string): number {
  const palavras = tituloDoCartao
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 3 && !p.startsWith('tutoria'));
  const posicoes = palavras.map((p) => frase.indexOf(p)).filter((i) => i >= 0);
  return posicoes.length ? Math.min(...posicoes) : Number.MAX_SAFE_INTEGER;
}

function iconeDe(bruto: unknown): IconeNotion {
  const i = bruto as
    | { type: 'emoji'; emoji: string }
    | { type: 'icon'; icon: { name: string; color?: string } }
    | { type: 'external'; external: { url: string } }
    | { type: 'file'; file: { url: string } }
    | null
    | undefined;
  if (!i) return null;
  if (i.type === 'emoji') return { tipo: 'emoji', emoji: i.emoji };
  // Ícones nativos do Notion: o SVG é público, pelo nome e pela cor.
  if (i.type === 'icon') return { tipo: 'url', url: `https://www.notion.so/icons/${i.icon.name}_${i.icon.color ?? 'gray'}.svg` };
  if (i.type === 'external') return { tipo: 'url', url: i.external.url };
  if (i.type === 'file') return { tipo: 'url', url: i.file.url };
  return null;
}

const conteudo = (b: NotionBlock) => (b[b.type] ?? {}) as { rich_text?: RichText[]; is_toggleable?: boolean };
const juntar = (rt: RichText[] | undefined) => (rt ?? []).map((t) => t.plain_text ?? '').join('').trim();

/** A página "Tutorias" da área de membros, entre os cartões da área da mentorada. */
async function paginaDeTutorias(mentoradaId: string, redescobrir = false): Promise<string | null> {
  const db = supabaseAdmin();
  if (!redescobrir) {
    const { data: salva } = await db
      .from('notion_resolved_ids')
      .select('notion_id')
      .eq('section_key', chave(mentoradaId))
      .maybeSingle();
    if (salva?.notion_id) return salva.notion_id;
  }

  const area = await paginaDaAreaDeMembros(mentoradaId);
  const callout = area ? await acharFilho(area, (b) => ehCallout(b, AREA_DE_MEMBROS.calloutCartoes)) : null;
  const base = callout ? await acharFilho(callout.id, (b) => b.type === 'child_database') : null;
  if (!base) return null;

  const cartoes = await queryDatabase(base.id, { limite: 50 });
  const tutorias = cartoes.find((c) => titulo(c).trim().toLowerCase() === AREA_DE_MEMBROS.cartaoTutorias.toLowerCase());
  if (!tutorias) return null;

  await db
    .from('notion_resolved_ids')
    .upsert({ section_key: chave(mentoradaId), notion_id: tutorias.id, resolved_at: new Date().toISOString() });
  return tutorias.id;
}
