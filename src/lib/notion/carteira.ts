import 'server-only';
import { cache } from 'react';
import { queryDatabase, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { MENTORADA, STATUS_INATIVOS } from './config';
import { iconeUrl, texto, titulo } from './props';

/**
 * Quem a tutora vê.
 *
 * A lista sai de "Área clientes" — a mesma página de onde pendura todo o
 * conteúdo. Por isso `areaDaClienteIds` é a própria linha: não há desvio.
 *
 * ⚠️ Hoje toda tutora enxerga todas as mentoradas. Não é descuido: não existe no
 * Notion um vínculo tutora↔mentorada que dê para filtrar. Quando existir, é aqui
 * que entra o filtro.
 */

export type Mentorada = {
  id: string;
  nome: string;
  mentoria: string;
  status: string;
  /** A própria linha. Mantido em lista para o resto do código não mudar. */
  areaDaClienteIds: string[];
  /** Ícone da página dela. URL assinada, expira — só serve ao vivo. */
  foto: string | null;
};

function paraMentorada(page: NotionPage): Mentorada {
  return {
    id: page.id,
    nome: texto(page, MENTORADA.nome) || titulo(page),
    mentoria: texto(page, MENTORADA.mentoria),
    status: texto(page, MENTORADA.status),
    areaDaClienteIds: [page.id],
    foto: iconeUrl(page),
  };
}

export const carteiraDaTutora = cache(async (): Promise<Mentorada[]> => {
  const dbId = await resolverDatabaseId('areaClientes');
  const paginas = await queryDatabase(dbId, { limite: 300 });

  return paginas
    .map(paraMentorada)
    .filter((m) => !STATUS_INATIVOS.includes(m.status as (typeof STATUS_INATIVOS)[number]))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
});

/** IDs do Notion circulam com e sem hífen; a comparação precisa dos dois. */
export function normalizarId(id: string): string {
  const cru = id.replace(/-/g, '');
  if (cru.length !== 32) return id;
  return `${cru.slice(0, 8)}-${cru.slice(8, 12)}-${cru.slice(12, 16)}-${cru.slice(16, 20)}-${cru.slice(20)}`;
}
