import 'server-only';
import { queryDatabase } from './client';
import { normalizarId } from './carteira';
import { PROJETOS } from './config';
import { corDaOpcao, data, texto, titulo } from './props';
import { resolverDatabaseId } from './resolver';

/**
 * Projetos da mentorada.
 *
 * Base única, ligada à cliente pela relação "Cliente". É o guarda-chuva das
 * tarefas: desde nov/2026 cada tarefa pertence a um projeto, e é por ele que a
 * mentorada enxerga o próprio trabalho em vez de uma lista solta.
 *
 * Tarefa sem projeto continua existindo e aparece à parte — o Notion não
 * obriga o vínculo, e exigir aqui o que lá é opcional só esconderia trabalho.
 */
export type ProjetoDaMentoria = {
  id: string;
  nome: string;
  status: string;
  corStatus: string;
  /** "2026-11-01", quando o período tem início. */
  inicio: string | null;
  fim: string | null;
};

export async function projetosDaMentorada(mentoradaId: string): Promise<ProjetoDaMentoria[]> {
  const dbId = await resolverDatabaseId('projetos');
  const linhas = await queryDatabase(dbId, {
    filter: { property: PROJETOS.cliente, relation: { contains: normalizarId(mentoradaId) } },
    limite: 200,
  });

  return linhas
    .map((p) => ({
      id: p.id,
      nome: texto(p, PROJETOS.nome) || titulo(p) || 'Projeto',
      status: texto(p, PROJETOS.status),
      corStatus: corDaOpcao(p, PROJETOS.status),
      inicio: data(p, PROJETOS.periodo),
      fim: (p.properties?.[PROJETOS.periodo] as { date?: { end?: string | null } } | undefined)?.date?.end ?? null,
    }))
    // Do que está em andamento para o que já acabou, e dentro disso pelo
    // começo: é a ordem em que a mentorada pensa no próprio trabalho.
    .sort((a, b) => (a.inicio ?? '9999').localeCompare(b.inicio ?? '9999') || a.nome.localeCompare(b.nome, 'pt-BR'));
}
