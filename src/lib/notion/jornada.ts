import 'server-only';
import { queryDatabase } from './client';
import { resolverDatabaseId } from './resolver';
import { TUTORIA, TUTORIA_A_REALIZAR, TUTORIA_REALIZADA, cicloAtual } from './config';
import { data, texto } from './props';
import type { Mentorada } from './carteira';

/**
 * A jornada da mentorada, vista por ela: o que já aconteceu e o que vem.
 *
 * Sai da mesma base de controle que conta as tutorias da tutora
 * ("Acompanhamento de clientes"), só que recortada pela relation `Mentorada`,
 * que aponta para a página da cliente em "Área clientes".
 *
 * Só conta o ciclo atual (propriedade `Ciclo`): sessão de ciclo anterior — ou
 * sem ciclo preenchido — fica de fora.
 */

export type ProgressoDaMentoria = {
  ciclo: string;
  realizadas: number;
  aRealizar: number;
  proxima: { sessao: string; data: string } | null;
};

export async function progressoDaMentoria(mentorada: Mentorada): Promise<ProgressoDaMentoria> {
  const ciclo = cicloAtual();
  if (mentorada.areaDaClienteIds.length === 0) {
    return { ciclo, realizadas: 0, aRealizar: 0, proxima: null };
  }

  const dbId = await resolverDatabaseId('tutorias');
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

  let realizadas = 0;
  const futuras: { sessao: string; data: string | null }[] = [];

  for (const p of linhas) {
    const status = texto(p, TUTORIA.status);
    if (status === TUTORIA_REALIZADA) realizadas++;
    else if (TUTORIA_A_REALIZAR.includes(status)) {
      futuras.push({ sessao: texto(p, TUTORIA.sessao), data: data(p, TUTORIA.dataPrevista) });
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const proxima = futuras
    .filter((f): f is { sessao: string; data: string } => Boolean(f.data && f.data >= hoje))
    .sort((a, b) => a.data.localeCompare(b.data))[0];

  return {
    ciclo,
    realizadas,
    aRealizar: futuras.length,
    proxima: proxima ? { sessao: proxima.sessao, data: diaMesAno(proxima.data) } : null,
  };
}

/**
 * "2026-02-20" -> "20/02/2026", sem passar por Date: uma data sem hora vira
 * meia-noite UTC, e no fuso do Brasil isso cai no dia anterior.
 */
function diaMesAno(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}
