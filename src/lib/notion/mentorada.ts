import 'server-only';
import { queryDatabase, getDatabase, getPage, NotionError, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import {
  BRIEFINGS,
  HANDSOFF,
  MAPA,
  MAPA_CAMPOS,
  ORDEM_STATUS_OBJETIVO,
  PLANEJAMENTO,
  ehLegenda,
} from './config';
import { arquivoUrl, data, formatarData, iconeUrl, relationIds, texto, titulo } from './props';
import type { Mentorada } from './carteira';
import { nomesDasTutoras } from './tutora';

/**
 * Conteúdo de uma mentorada, sempre buscado ao vivo.
 *
 * Todo filtro leva o ID da tutora junto com o da mentorada: mesmo que a
 * carteira já tenha autorizado o acesso, a consulta não devolve linha de outra
 * tutora nem por engano. É cinto e suspensório de propósito.
 */

export type CampoMapa = { nome: string; valor: string; longo: boolean };

export type ItemMapa = {
  id: string;
  titulo: string;
  foto: string | null;
  campos: CampoMapa[];
};

export type ItemPlanejamento = {
  id: string;
  objetivo: string;
  status: string;
  trimestre: string;
  mes: string;
  pilar: string;
  tutoria: string;
  ano: string;
};

export type ItemBriefing = {
  id: string;
  titulo: string;
  data: string;
};

export type ItemHandsoff = {
  id: string;
  titulo: string;
  dataSessao: string;
  /** Quem escreveu. Vem da relation, não do título — o título é editável à mão. */
  tutora: string;
  /** Escrito pela tutora logada, e portanto editável por ela. */
  minha: boolean;
  url: string;
};

/**
 * A foto da mentorada.
 *
 * Não está na base do mapa nem na linha dela em "Área das tutoras": mora como
 * ícone da página dela em "Área clientes" — a área individual. É uma requisição
 * a mais, então só é feita na página da mentorada, nunca na listagem.
 */
export async function fotoDaMentorada(mentorada: Mentorada): Promise<string | null> {
  for (const id of mentorada.areaDaClienteIds) {
    const page = await getPage(id).catch(() => null);
    const foto = page && iconeUrl(page);
    if (foto) return foto;
  }
  return null;
}

/**
 * Filtro "é desta mentorada".
 *
 * Desde que o conteúdo passou a se pendurar na área individual, a chave é a
 * página da cliente em "Área clientes" — nunca a linha dela em "Área das
 * tutoras". Usar o ID errado não dá erro: devolve zero linhas, que é
 * indistinguível de "não tem nada".
 */
function daMentorada(mentorada: Mentorada, propriedade: string) {
  const ids = mentorada.areaDaClienteIds;
  return {
    or: ids.map((id) => ({ property: propriedade, relation: { contains: id } })),
  };
}

export async function mapaDaCliente(mentorada: Mentorada): Promise<ItemMapa[]> {
  if (mentorada.areaDaClienteIds.length === 0) return [];

  const dbId = await resolverDatabaseId('mapas');
  const linhas = await queryDatabase(dbId, {
    filter: daMentorada(mentorada, MAPA.mentorada),
    limite: 20,
  });

  return linhas.map((p) => ({
    id: p.id,
    titulo: texto(p, MAPA.titulo) || titulo(p) || 'Mapa da cliente',
    // A capa da mentorada é arte da marca, igual para todas — não serve de
    // retrato. Só a propriedade `Foto`, quando existir, vale como foto.
    foto: arquivoUrl(p, MAPA.foto),
    campos: camposDoMapa(p),
  }));
}

/** Data crua do Notion não se lê: `1993-08-18` vira `18/08/1993`. */
function comoTexto(page: NotionPage, nome: string): string {
  const bruto = texto(page, nome);
  const ehData = page.properties?.[nome]?.type === 'date';
  return ehData ? formatarData(bruto) : bruto;
}

/** Status desconhecido cai antes dos concluídos, nunca no fim. */
function pesoDoStatus(status: string): number {
  const i = ORDEM_STATUS_OBJETIVO.findIndex(
    (s) => s.toLowerCase() === status.trim().toLowerCase(),
  );
  return i === -1 ? ORDEM_STATUS_OBJETIVO.indexOf('Concluído') - 0.5 : i;
}

/** Só os campos preenchidos, com o rótulo que a mentorada vê no Notion. */
function camposDoMapa(page: NotionPage): CampoMapa[] {
  const conhecidos = new Set(MAPA_CAMPOS.map((c) => c.valor));

  const doMapa = MAPA_CAMPOS.map((campo) => ({
    nome: (campo.legenda ? texto(page, campo.legenda) : '').replace(/:\s*$/, '') || campo.reserva,
    valor: comoTexto(page, campo.valor),
    longo: Boolean(campo.longo),
  }));

  // Campo novo criado no Notion depois disto entra no fim sozinho, com o
  // próprio nome como rótulo — melhor aparecer sem rótulo bonito do que sumir.
  const extras = Object.keys(page.properties ?? {})
    .filter(
      (n) =>
        !conhecidos.has(n) &&
        !ehLegenda(n) &&
        n !== MAPA.titulo &&
        n !== MAPA.mentorada &&
        n !== MAPA.foto,
    )
    .map((n) => ({ nome: n.trim(), valor: comoTexto(page, n), longo: true }));

  return [...doMapa, ...extras].filter((c) => c.valor);
}

/**
 * Objetivos da mentorada — ou `null` quando não dá para recortar.
 *
 * Cuidado com a chave: `Área da mentorada` NÃO aponta para a linha da mentorada
 * em "Área das tutoras", e sim para a página dela na base "Área clientes". Usar
 * o ID errado aqui não dá erro — devolve zero objetivos, que é indistinguível
 * de "ela não tem objetivos". Por isso o filtro vai pelo `Área da cliente` da
 * mentorada.
 *
 * `null` quando não existe esse vínculo (ou a base "Área clientes" não está
 * conectada à integração): a tela precisa dizer que não consegue separar, em
 * vez de afirmar que não há objetivos.
 */
export async function planejamento(
  mentorada: Mentorada,
): Promise<ItemPlanejamento[] | null> {
  if (mentorada.areaDaClienteIds.length === 0) return null;

  const dbId = await resolverDatabaseId('planejamento');

  const schema = await getDatabase(dbId);
  if (!Object.values(schema.properties).some((p) => p.name === PLANEJAMENTO.areaDaMentorada)) {
    return null;
  }

  let linhas;
  try {
    linhas = await queryDatabase(dbId, {
      filter: daMentorada(mentorada, PLANEJAMENTO.areaDaMentorada),
    });
  } catch (erro) {
    const semRecorte =
      erro instanceof NotionError && (erro.code === 'validation_error' || erro.status === 400);
    if (semRecorte) return null;
    throw erro;
  }

  return linhas
    .map((p) => ({
    id: p.id,
    objetivo: texto(p, PLANEJAMENTO.objetivo) || titulo(p),
    status: texto(p, PLANEJAMENTO.status),
    trimestre: texto(p, PLANEJAMENTO.trimestre),
    mes: texto(p, PLANEJAMENTO.mes),
    pilar: texto(p, PLANEJAMENTO.pilar),
    tutoria: texto(p, PLANEJAMENTO.tutoria),
    ano: texto(p, PLANEJAMENTO.ano),
    }))
    .sort((a, b) => pesoDoStatus(a.status) - pesoDoStatus(b.status));
}

export async function briefings(
  mentorada: Mentorada,
  tutoraPageId: string,
): Promise<ItemBriefing[]> {
  const dbId = await resolverDatabaseId('briefings');
  if (mentorada.areaDaClienteIds.length === 0) return [];

  const linhas = await queryDatabase(dbId, {
    filter: {
      and: [
        daMentorada(mentorada, BRIEFINGS.mentorada),
        { property: BRIEFINGS.paraATutora, relation: { contains: tutoraPageId } },
      ],
    },
    sorts: [{ property: BRIEFINGS.data, direction: 'descending' }],
  });

  return linhas.map((p) => ({
    id: p.id,
    titulo: texto(p, BRIEFINGS.titulo) || titulo(p) || 'Briefing',
    data: formatarData(data(p, BRIEFINGS.data)),
  }));
}

export async function handsoffs(
  mentorada: Mentorada,
  tutoraPageId: string,
): Promise<ItemHandsoff[]> {
  const dbId = await resolverDatabaseId('handsoff');
  if (mentorada.areaDaClienteIds.length === 0) return [];

  const linhas = await queryDatabase(dbId, {
    filter: {
      and: [
        daMentorada(mentorada, HANDSOFF.mentorada),
        { property: HANDSOFF.feitoPelaTutora, relation: { contains: tutoraPageId } },
      ],
    },
    sorts: [{ property: HANDSOFF.dataDaSessao, direction: 'descending' }],
  });

  const nomes = await nomesDasTutoras();

  return linhas.map((p) => ({
    id: p.id,
    titulo: texto(p, HANDSOFF.nome) || titulo(p) || 'Hands-off',
    dataSessao: formatarData(data(p, HANDSOFF.dataDaSessao)),
    tutora:
      relationIds(p, HANDSOFF.feitoPelaTutora)
        .map((id) => nomes.get(id))
        .find(Boolean) ?? '',
    minha: relationIds(p, HANDSOFF.feitoPelaTutora).some(
      (id) => id.replace(/-/g, '') === tutoraPageId.replace(/-/g, ''),
    ),
    url: p.url,
  }));
}

/**
 * A página pedida pertence mesmo a esta mentorada?
 *
 * Antes isto montava a lista inteira de páginas permitidas — quatro consultas ao
 * Notion — só para responder sim ou não sobre uma. Ficava lento a ponto de dar
 * para ver: um clique para expandir um card esperava o app remontar tudo.
 *
 * Agora é uma consulta só: lê a própria página e confere de que base ela veio e
 * para quem ela aponta. Mesma garantia, porque a resposta continua vindo do
 * Notion e não do que o browser mandou.
 */
export async function paginaPertenceA(
  mentorada: Mentorada,
  pageId: string,
): Promise<boolean> {
  const page = await getPage(pageId).catch(() => null);
  const daBase = page?.parent?.database_id;
  if (!page || !daBase) return false;

  const [briefingsId, handsoffId, mapasId, planejamentoId] = await Promise.all([
    resolverDatabaseId('briefings'),
    resolverDatabaseId('handsoff'),
    resolverDatabaseId('mapas'),
    resolverDatabaseId('planejamento'),
  ]);

  const mesmaBase = (a: string, b: string) => a.replace(/-/g, '') === b.replace(/-/g, '');
  const aponta = (prop: string, alvos: string[]) =>
    relationIds(page, prop).some((id) =>
      alvos.some((alvo) => alvo.replace(/-/g, '') === id.replace(/-/g, '')),
    );

  const daCliente = mentorada.areaDaClienteIds;

  if (mesmaBase(daBase, briefingsId)) return aponta(BRIEFINGS.mentorada, daCliente);
  if (mesmaBase(daBase, handsoffId)) return aponta(HANDSOFF.mentorada, daCliente);
  if (mesmaBase(daBase, mapasId)) return aponta(MAPA.mentorada, daCliente);
  if (mesmaBase(daBase, planejamentoId)) {
    return aponta(PLANEJAMENTO.areaDaMentorada, daCliente);
  }

  return false;
}

export { relationIds };
