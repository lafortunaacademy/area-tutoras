import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { queryDatabase, getPage, NotionError, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { BRIEFINGS, HANDSOFF, MENTORADA, STATUS_ATIVA } from './config';
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
    mentoria: texto(page, MENTORADA.mentoria),
    status: texto(page, MENTORADA.status),
    areaDaClienteIds: relationIds(page, MENTORADA.areaDaCliente),
  };
}

/**
 * A carteira da tutora.
 *
 * Caminho direto: a base "Área das tutoras" tem uma relation para a tutora, e o
 * filtro é uma query só. É o caminho certo — mas essa relation AINDA NÃO EXISTE
 * no Notion (conferido em 2026-09-10), então hoje o Notion responde
 * `validation_error` e o código cai no caminho derivado.
 *
 * Caminho derivado: só a base Hands-off liga tutora e mentorada por relations
 * filtráveis, então a carteira é o conjunto de mentoradas com quem a tutora já
 * registrou pelo menos uma sessão. Isso tem um furo conhecido: uma mentorada
 * recém-atribuída, antes do primeiro hands-off, não aparece. Não dá para
 * contornar no código — a informação não existe no Notion. A saída é criar a
 * relation `Tutora` em "Área das tutoras"; aí o caminho direto assume sozinho.
 */
export const carteiraDaTutora = cache(async (tutoraPageId: string): Promise<Mentorada[]> => {
  const areaId = await resolverDatabaseId('areaDasTutoras');

  try {
    const paginas = await queryDatabase(areaId, {
      filter: {
        and: [
          { property: MENTORADA.tutora, relation: { contains: tutoraPageId } },
          { property: MENTORADA.status, status: { equals: STATUS_ATIVA } },
        ],
      },
    });
    return paginas.map(paraMentorada).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  } catch (erro) {
    const semPropriedade =
      erro instanceof NotionError &&
      (erro.code === 'validation_error' || erro.status === 400);
    if (!semPropriedade) throw erro;
  }

  const ids = await mentoradaIdsPelasRelations(tutoraPageId);
  const paginas = await Promise.all([...ids].map((id) => getPage(id).catch(() => null)));

  return paginas
    .filter((p): p is NotionPage => p !== null)
    .map(paraMentorada)
    .filter((m) => !m.status || m.status === STATUS_ATIVA)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
});

/** Junta os IDs de mentorada que aparecem ligados a esta tutora em cada base. */
async function mentoradaIdsPelasRelations(tutoraPageId: string): Promise<Set<string>> {
  // Só entra base cujas DUAS pontas sejam relation utilizável. Planejamento
  // fica de fora: a relation para a mentorada aponta para uma base não
  // compartilhada e volta sempre vazia.
  const fontes = [
    { secao: 'handsoff', tutora: HANDSOFF.feitoPelaTutora, mentorada: HANDSOFF.mentorada },
    { secao: 'briefings', tutora: BRIEFINGS.paraATutora, mentorada: BRIEFINGS.mentorada },
  ] as const;

  const ids = new Set<string>();

  await Promise.all(
    fontes.map(async (fonte) => {
      try {
        const dbId = await resolverDatabaseId(fonte.secao);
        const linhas = await queryDatabase(dbId, {
          filter: { property: fonte.tutora, relation: { contains: tutoraPageId } },
        });
        for (const linha of linhas) {
          for (const id of relationIds(linha, fonte.mentorada)) ids.add(id);
        }
      } catch {
        // Uma base indisponível não pode derrubar a carteira inteira —
        // as outras ainda respondem.
      }
    }),
  );

  return ids;
}

/**
 * Porta de entrada de toda página de mentorada.
 *
 * Um ID que não está na carteira vira 404 — a mesma resposta de um ID que não
 * existe, para não confirmar a existência da mentorada de outra tutora.
 */
export async function exigirMentorada(
  tutoraPageId: string,
  mentoradaId: string,
): Promise<Mentorada> {
  const carteira = await carteiraDaTutora(tutoraPageId);
  const mentorada = carteira.find((m) => m.id === normalizarId(mentoradaId));
  if (!mentorada) notFound();
  return mentorada;
}

/** IDs do Notion circulam com e sem hífen; a comparação precisa dos dois. */
export function normalizarId(id: string): string {
  const cru = id.replace(/-/g, '');
  if (cru.length !== 32) return id;
  return `${cru.slice(0, 8)}-${cru.slice(8, 12)}-${cru.slice(12, 16)}-${cru.slice(16, 20)}-${cru.slice(20)}`;
}
