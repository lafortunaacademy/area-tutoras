import 'server-only';
import { cache } from 'react';
import { queryDatabase, NotionError, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { MENTORADA, STATUS_ATIVA } from './config';
import { relationIds, texto, titulo } from './props';

/**
 * Quem a tutora pode ver.
 *
 * As bases do Notion são compartilhadas por todas as tutoras — o recorte de
 * cada uma existe só como relation. Então NÃO EXISTE consulta "da tutora":
 * existe consulta filtrada. Este módulo é a única fonte dessa lista, e toda
 * página que mostra dados de uma mentorada passa por `exigirMentorada`.
 */

export type Mentorada = {
  id: string;
  nome: string;
  mentoria: string;
  status: string;
  areaDaClienteIds: string[];
};

function paraMentorada(page: NotionPage): Mentorada {
  return {
    id: page.id,
    nome: texto(page, MENTORADA.nome) || titulo(page),
    mentoria: MENTORADA.mentoria.map((n) => texto(page, n)).find(Boolean) ?? '',
    status: texto(page, MENTORADA.status),
    areaDaClienteIds: relationIds(page, MENTORADA.areaDaCliente),
  };
}

/**
 * As mentoradas que a tutora vê.
 *
 * Caminho certo: a base "Área das tutoras" tem uma relation para a tutora, e a
 * lista é um filtro só. Essa relation AINDA NÃO EXISTE no Notion — enquanto
 * não existir, o Notion responde `validation_error` e caímos na lista completa
 * de mentoradas ativas.
 *
 * ⚠️ Isso quer dizer que HOJE toda tutora enxerga todas as 44 ativas. Não é um
 * descuido: é a única coisa possível sem o vínculo, e foi decidido assim para
 * a área já servir. Criar a relation `Tutora` fecha isso sozinho — o código já
 * tenta por ela primeiro, e o dia em que existir cada tutora passa a ver só as
 * suas, sem precisar mexer aqui.
 */
export const carteiraDaTutora = cache(async (tutoraPageId: string): Promise<Mentorada[]> => {
  const areaId = await resolverDatabaseId('areaDasTutoras');

  const ativas = { property: MENTORADA.status, status: { equals: STATUS_ATIVA } };

  try {
    const paginas = await queryDatabase(areaId, {
      filter: {
        and: [{ property: MENTORADA.tutora, relation: { contains: tutoraPageId } }, ativas],
      },
    });
    return paginas.map(paraMentorada).sort(porNome);
  } catch (erro) {
    const semRelation =
      erro instanceof NotionError &&
      (erro.code === 'validation_error' || erro.status === 400);
    if (!semRelation) throw erro;
  }

  const todas = await queryDatabase(areaId, { filter: ativas });
  return todas.map(paraMentorada).sort(porNome);
});

const porNome = (a: Mentorada, b: Mentorada) => a.nome.localeCompare(b.nome, 'pt-BR');

/** IDs do Notion circulam com e sem hífen; a comparação precisa dos dois. */
export function normalizarId(id: string): string {
  const cru = id.replace(/-/g, '');
  if (cru.length !== 32) return id;
  return `${cru.slice(0, 8)}-${cru.slice(8, 12)}-${cru.slice(12, 16)}-${cru.slice(16, 20)}-${cru.slice(20)}`;
}
