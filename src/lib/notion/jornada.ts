import 'server-only';
import { queryDatabase, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { SEM_TUTORA, TUTORIA, TUTORIA_A_REALIZAR, TUTORIA_REALIZADA } from './config';
import { cicloMaisRecente } from './sessoesDaMentorada';
import { data, relationIds, texto } from './props';
import { nomesDasTutoras } from './tutora';
import type { Mentorada } from './carteira';

/**
 * A jornada da mentorada, vista por ela: o que já aconteceu e o que vem.
 *
 * Sai da mesma base de controle que conta as tutorias da tutora
 * ("Acompanhamento de clientes"), só que recortada pela relation `Mentorada`,
 * que aponta para a página da cliente em "Área clientes".
 *
 * Só conta o ciclo atual (propriedade `Ciclo`) e as sessões ainda sem ciclo;
 * sessão marcada com outro ciclo fica de fora.
 */

export type TutoriasPorTutora = { tutora: string; total: number }[];

/** Contagem pela propriedade "Sessão " (Check-in, Tutoria, Planejamento, Call SOS). */
export type SessoesPorTipo = { tipo: string; total: number }[];

/** Sessão sem o tipo preenchido no Notion. */
export const SEM_TIPO = 'Sem tipo';

export type ProgressoDaMentoria = {
  ciclo: string;
  realizadas: number;
  aRealizar: number;
  /** Quantas sessões de cada tutora, como os gráficos do Notion agrupam. */
  porTutora: { realizadas: TutoriasPorTutora; aRealizar: TutoriasPorTutora };
  /** As que faltam, agrupadas por tipo de sessão — é assim que a rosca mostra. */
  porTipo: { aRealizar: SessoesPorTipo };
  proxima: { sessao: string; data: string } | null;
};


export async function progressoDaMentoria(
  mentorada: Mentorada,
  /** Ciclo mostrado ("Ciclo 3"); sem ele, o mais recente. */
  cicloPedido?: string,
): Promise<ProgressoDaMentoria> {
  const ciclo = cicloPedido ?? (await cicloMaisRecente());
  const vazio: ProgressoDaMentoria = {
    ciclo,
    realizadas: 0,
    aRealizar: 0,
    porTutora: { realizadas: [], aRealizar: [] },
    porTipo: { aRealizar: [] },
    proxima: null,
  };
  if (mentorada.areaDaClienteIds.length === 0) return vazio;

  const dbId = await resolverDatabaseId('tutorias');
  const nomesPromessa = nomesDasTutoras();
  const linhas = await queryDatabase(dbId, {
    filter: {
      and: [
        {
          or: mentorada.areaDaClienteIds.map((id) => ({
            property: TUTORIA.mentorada,
            relation: { contains: id },
          })),
        },
        { property: TUTORIA.ciclo, select: { equals: ciclo } },
      ],
    },
    limite: 500,
  });

  const nomes = await nomesPromessa;

  const realizadas: NotionPage[] = [];
  const futuras: NotionPage[] = [];
  for (const p of linhas) {
    const status = texto(p, TUTORIA.status);
    if (status === TUTORIA_REALIZADA) realizadas.push(p);
    else if (TUTORIA_A_REALIZAR.includes(status)) futuras.push(p);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const proxima = futuras
    .map((p) => ({ sessao: texto(p, TUTORIA.sessao), data: data(p, TUTORIA.dataPrevista) }))
    .filter((f): f is { sessao: string; data: string } => Boolean(f.data && f.data >= hoje))
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  return {
    ciclo,
    realizadas: realizadas.length,
    aRealizar: futuras.length,
    porTutora: {
      realizadas: contarPorTutora(realizadas, nomes),
      aRealizar: contarPorTutora(futuras, nomes),
    },
    porTipo: { aRealizar: contarPorTipo(futuras) },
    proxima: proxima ? { sessao: proxima.sessao, data: diaMesAno(proxima.data) } : null,
  };
}

/**
 * Agrupa pela relation `Tutoras` (a base de tutoras), não pelo campo de pessoa
 * `Tutora`: é assim que os gráficos do Notion agrupam, e o nome sai como está
 * cadastrado lá ("Bela Mestriner", não o nome da conta). Sessão com duas
 * tutoras conta para as duas.
 */
function contarPorTutora(paginas: NotionPage[], nomesPorId: Map<string, string>): TutoriasPorTutora {
  const contagem = new Map<string, number>();
  for (const p of paginas) {
    const nomes = relationIds(p, TUTORIA.tutoras)
      .map((id) => nomesPorId.get(id)?.trim())
      .filter((n): n is string => Boolean(n));
    for (const nome of nomes.length > 0 ? nomes : [SEM_TUTORA]) {
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
  }
  return [...contagem.entries()]
    .map(([tutora, total]) => ({ tutora, total }))
    .sort((a, b) => b.total - a.total || a.tutora.localeCompare(b.tutora));
}

/** As sessões que faltam, contadas por tipo ("Sessão "), da maior para a menor. */
function contarPorTipo(paginas: NotionPage[]): SessoesPorTipo {
  const contagem = new Map<string, number>();
  for (const p of paginas) {
    const tipo = texto(p, TUTORIA.tipo).trim() || SEM_TIPO;
    contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));
}

/**
 * "2026-02-20" -> "20/02/2026", sem passar por Date: uma data sem hora vira
 * meia-noite UTC, e no fuso do Brasil isso cai no dia anterior.
 */
function diaMesAno(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}
