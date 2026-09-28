import 'server-only';
import { cache } from 'react';
import { getUser, queryDatabase, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { TUTORIA, TUTORIA_A_REALIZAR, TUTORIA_REALIZADA } from './config';
import { corDaOpcao, data, relationIds, texto } from './props';

/**
 * As tutorias dadas, da base "Acompanhamento de clientes".
 *
 * É o controle de verdade — 961 sessões, contra os poucos hands-off, que são o
 * diário da sessão e não o registro dela. Só `Realizada` conta.
 *
 * O campo `Tutora` lá é de pessoa (usuário do Notion), e a tutora logada é uma
 * linha no Supabase com um e-mail. A ponte entre os dois é esse e-mail: os
 * usuários que aparecem nas sessões são consultados uma vez e casados por ele.
 * Nome não serve — "Maisa Miranda" no Notion é "Maísa Miranda" no usuário,
 * "Rafaela Ribas" é "Rafaela Ribas da Rocha".
 */

export type Tutoria = {
  id: string;
  sessao: string;
  data: string | null;
  mentoradaIds: string[];
  /** Tema pela fórmula "Tutoria" ("Produto", "Conteúdo"…). */
  tema: string;
};

/** Sessão que ainda vai acontecer, da mesma base. */
export type TutoriaAgendada = {
  id: string;
  sessao: string;
  status: string;
  corStatus: string;
  data: string | null;
  mentoradaIds: string[];
  tema: string;
};

/** Todas as sessões realizadas, cruas. Uma consulta por requisição. */
const todasRealizadas = cache(async (): Promise<NotionPage[]> => {
  const dbId = await resolverDatabaseId('tutorias');
  return queryDatabase(dbId, {
    filter: { property: TUTORIA.status, status: { equals: TUTORIA_REALIZADA } },
    limite: 2000,
  });
});

/** e-mail (minúsculo) -> id do usuário do Notion, entre quem deu tutoria. */
const usuariosPorEmail = cache(async (): Promise<Map<string, string>> => {
  const linhas = await todasRealizadas();

  const ids = new Set<string>();
  for (const linha of linhas) {
    const prop = linha.properties?.[TUTORIA.tutora];
    if (prop?.type !== 'people') continue;
    for (const u of (prop.people as { id: string }[]) ?? []) ids.add(u.id);
  }

  const mapa = new Map<string, string>();
  await Promise.all(
    [...ids].map(async (id) => {
      const u = await getUser(id).catch(() => null);
      const email = u?.person?.email?.toLowerCase();
      if (email) mapa.set(email, id);
    }),
  );
  return mapa;
});

export async function tutoriasDaTutora(email: string): Promise<Tutoria[]> {
  const usuarios = await usuariosPorEmail();
  const usuarioId = usuarios.get(email.trim().toLowerCase());
  if (!usuarioId) return [];

  const linhas = await todasRealizadas();

  return linhas
    .filter((p) => {
      const prop = p.properties?.[TUTORIA.tutora];
      if (prop?.type !== 'people') return false;
      return ((prop.people as { id: string }[]) ?? []).some((u) => u.id === usuarioId);
    })
    .map((p) => ({
      id: p.id,
      sessao: texto(p, TUTORIA.sessao),
      // A data que vale é a da sessão realizada; a prevista é plano.
      data: data(p, TUTORIA.dataRealizada) ?? data(p, TUTORIA.dataPrevista),
      mentoradaIds: relationIds(p, TUTORIA.mentorada),
      tema: texto(p, TUTORIA.tema),
    }))
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
}

/** A tutora logada tem usuário do Notion reconhecido? */
export async function temUsuarioNoNotion(email: string): Promise<boolean> {
  const usuarios = await usuariosPorEmail();
  return usuarios.has(email.trim().toLowerCase());
}

/** Todas as sessões que ainda vão acontecer, cruas. Uma consulta por requisição. */
const todasARealizar = cache(async (): Promise<NotionPage[]> => {
  const dbId = await resolverDatabaseId('tutorias');
  return queryDatabase(dbId, {
    filter: { or: TUTORIA_A_REALIZAR.map((s) => ({ property: TUTORIA.status, status: { equals: s } })) },
    limite: 2000,
  });
});

/**
 * As próximas sessões da tutora, da mais próxima para a mais distante. Sem data
 * marcada entram no fim: são as que faltam agendar.
 */
export async function proximasDaTutora(email: string, tutoraPageId: string): Promise<TutoriaAgendada[]> {
  const usuarios = await usuariosPorEmail();
  const usuarioId = usuarios.get(email.trim().toLowerCase());
  const linhas = await todasARealizar();

  return linhas
    .filter((p) => {
      const prop = p.properties?.[TUTORIA.tutora];
      const dela = prop?.type === 'people' && ((prop.people as { id: string }[]) ?? []).some((u) => u.id === usuarioId);
      // A relation `Tutoras` cobre quem ainda não tem sessão realizada (e por
      // isso nenhum usuário reconhecido pelo e-mail).
      return dela || relationIds(p, TUTORIA.tutoras).includes(tutoraPageId);
    })
    .map((p) => ({
      id: p.id,
      sessao: texto(p, TUTORIA.sessao),
      status: texto(p, TUTORIA.status),
      corStatus: corDaOpcao(p, TUTORIA.status),
      data: data(p, TUTORIA.dataPrevista),
      mentoradaIds: relationIds(p, TUTORIA.mentorada),
      tema: texto(p, TUTORIA.tema),
    }))
    .sort((a, b) => (a.data ?? '9999').localeCompare(b.data ?? '9999'));
}
