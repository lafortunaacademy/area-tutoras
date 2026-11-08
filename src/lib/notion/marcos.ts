import 'server-only';
import { queryDatabase } from './client';
import { normalizarId } from './carteira';
import { GESTAO_MARCOS } from './config';
import { data, texto, titulo } from './props';
import { resolverDatabaseId } from './resolver';

/**
 * Marcos e conquistas da mentorada.
 *
 * Como as tarefas, desde nov/2026 moram numa base única ligada à cliente pela
 * relação "Cliente". A base antiga, dentro da página de cada mentorada, segue
 * sendo lida por `gestaoDeResultados` enquanto houver quem não migrou.
 */
export type MarcoDaMentoria = { id: string; titulo: string; data: string | null };

export async function marcosDaMentorada(mentoradaId: string): Promise<MarcoDaMentoria[]> {
  const dbId = await resolverDatabaseId('marcos');
  const linhas = await queryDatabase(dbId, {
    filter: { property: GESTAO_MARCOS.cliente, relation: { contains: normalizarId(mentoradaId) } },
    limite: 300,
  });

  return linhas
    .map((p) => ({
      id: p.id,
      titulo: texto(p, GESTAO_MARCOS.titulo) || titulo(p),
      data: data(p, GESTAO_MARCOS.data),
    }))
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
}
