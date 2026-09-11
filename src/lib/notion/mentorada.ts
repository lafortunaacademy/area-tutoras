import 'server-only';
import { queryDatabase, getPage, getDatabase, NotionError, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { BRIEFINGS, HANDSOFF, MAPA, PLANEJAMENTO } from './config';
import { data, formatarData, relationIds, texto, titulo } from './props';
import type { Mentorada } from './carteira';

/**
 * Conteúdo de uma mentorada, sempre buscado ao vivo.
 *
 * Todo filtro leva o ID da tutora junto com o da mentorada: mesmo que a
 * carteira já tenha autorizado o acesso, a consulta não devolve linha de outra
 * tutora nem por engano. É cinto e suspensório de propósito.
 */

export type ItemMapa = {
  id: string;
  titulo: string;
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
  mentoria: string;
};

export type ItemHandsoff = {
  id: string;
  titulo: string;
  dataSessao: string;
  url: string;
};

export async function mapaDaCliente(mentorada: Mentorada): Promise<ItemMapa[]> {
  // O mapa costuma vir pela relation "Área da cliente" da própria mentorada.
  if (mentorada.areaDaClienteIds.length > 0) {
    const paginas = await Promise.all(
      mentorada.areaDaClienteIds.map((id) => getPage(id).catch(() => null)),
    );
    return paginas
      .filter((p): p is NotionPage => p !== null)
      .map((p) => ({ id: p.id, titulo: titulo(p) || 'Mapa da cliente' }));
  }

  try {
    const dbId = await resolverDatabaseId('mapas');
    const linhas = await queryDatabase(dbId, {
      filter: { property: MAPA.mentorada, relation: { contains: mentorada.id } },
      limite: 20,
    });
    return linhas.map((p) => ({ id: p.id, titulo: texto(p, MAPA.titulo) || titulo(p) }));
  } catch {
    return [];
  }
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
      filter: {
        or: mentorada.areaDaClienteIds.map((id) => ({
          property: PLANEJAMENTO.areaDaMentorada,
          relation: { contains: id },
        })),
      },
    });
  } catch (erro) {
    const semRecorte =
      erro instanceof NotionError && (erro.code === 'validation_error' || erro.status === 400);
    if (semRecorte) return null;
    throw erro;
  }

  return linhas.map((p) => ({
    id: p.id,
    objetivo: texto(p, PLANEJAMENTO.objetivo) || titulo(p),
    status: texto(p, PLANEJAMENTO.status),
    trimestre: texto(p, PLANEJAMENTO.trimestre),
    mes: texto(p, PLANEJAMENTO.mes),
    pilar: texto(p, PLANEJAMENTO.pilar),
    tutoria: texto(p, PLANEJAMENTO.tutoria),
    ano: texto(p, PLANEJAMENTO.ano),
  }));
}

export async function briefings(
  mentorada: Mentorada,
  tutoraPageId: string,
): Promise<ItemBriefing[]> {
  const dbId = await resolverDatabaseId('briefings');
  const linhas = await queryDatabase(dbId, {
    filter: {
      and: [
        { property: BRIEFINGS.mentorada, relation: { contains: mentorada.id } },
        { property: BRIEFINGS.paraATutora, relation: { contains: tutoraPageId } },
      ],
    },
    sorts: [{ property: BRIEFINGS.data, direction: 'descending' }],
  });

  return linhas.map((p) => ({
    id: p.id,
    titulo: texto(p, BRIEFINGS.titulo) || titulo(p) || 'Briefing',
    data: formatarData(data(p, BRIEFINGS.data)),
    mentoria: texto(p, BRIEFINGS.mentoria),
  }));
}

export async function handsoffs(
  mentorada: Mentorada,
  tutoraPageId: string,
): Promise<ItemHandsoff[]> {
  const dbId = await resolverDatabaseId('handsoff');
  const linhas = await queryDatabase(dbId, {
    filter: {
      and: [
        { property: HANDSOFF.mentorada, relation: { contains: mentorada.id } },
        { property: HANDSOFF.feitoPelaTutora, relation: { contains: tutoraPageId } },
      ],
    },
    sorts: [{ property: HANDSOFF.dataDaSessao, direction: 'descending' }],
  });

  return linhas.map((p) => ({
    id: p.id,
    titulo: texto(p, HANDSOFF.nome) || titulo(p) || 'Hands-off',
    dataSessao: formatarData(data(p, HANDSOFF.dataDaSessao)),
    url: p.url,
  }));
}

/**
 * Todo ID de página que a tutora tem direito de abrir nesta mentorada.
 *
 * A rota de conteúdo sob demanda (`/api/notion-content/[pageId]`) confere o ID
 * pedido contra esta lista, montada no servidor. Nada do que o browser manda
 * entra na decisão além do próprio ID pedido.
 */
export async function pageIdsPermitidos(
  mentorada: Mentorada,
  tutoraPageId: string,
): Promise<Set<string>> {
  const [mapa, plano, brief, hands] = await Promise.all([
    mapaDaCliente(mentorada),
    planejamento(mentorada).catch(() => null),
    briefings(mentorada, tutoraPageId).catch(() => []),
    handsoffs(mentorada, tutoraPageId).catch(() => []),
  ]);

  return new Set([
    ...mapa.map((i) => i.id),
    ...(plano ?? []).map((i) => i.id),
    ...brief.map((i) => i.id),
    ...hands.map((i) => i.id),
  ]);
}

export { relationIds };
