import 'server-only';
import { cache } from 'react';
import { getPage, queryDatabase } from './client';
import { resolverDatabaseId } from './resolver';
import { HANDSOFF, TUTORA, VALOR_POR_SESSAO } from './config';
import { carteiraDaTutora } from './carteira';
import { arquivoUrl, data, numero, relationIds, texto } from './props';

/** Quem é a tutora e o que ela já fez — o conteúdo da página de Início. */

export type PerfilTutora = {
  nome: string;
  foto: string | null;
  status: string;
  areaDoMetodo: string;
  especialidades: string;
  programa: string;
  mentoria: string;
  topicos: string;
};

export type Sessao = {
  id: string;
  titulo: string;
  data: string | null;
  mentoradaIds: string[];
  /** Da propriedade `Valor`, se existir; senão da tabela de preços. */
  valor: number | null;
};

export type MesDeSessoes = {
  /** `2026-09`, para ordenar sem ambiguidade. */
  chave: string;
  rotulo: string;
  sessoes: number;
  valor: number | null;
};

/** id da tutora -> nome, para rotular quem assinou cada hands-off. */
export const nomesDasTutoras = cache(async (): Promise<Map<string, string>> => {
  const dbId = await resolverDatabaseId('tutoras');
  const linhas = await queryDatabase(dbId, { limite: 200 });
  return new Map(linhas.map((p) => [p.id, texto(p, TUTORA.nome)]));
});

export async function perfilDaTutora(tutoraPageId: string): Promise<PerfilTutora | null> {
  const page = await getPage(tutoraPageId).catch(() => null);
  if (!page) return null;

  return {
    nome: texto(page, TUTORA.nome),
    foto: arquivoUrl(page, TUTORA.foto),
    status: texto(page, TUTORA.status),
    areaDoMetodo: texto(page, TUTORA.areaDoMetodo),
    especialidades: texto(page, TUTORA.especialidades),
    programa: texto(page, TUTORA.programa),
    mentoria: texto(page, TUTORA.mentoria),
    topicos: texto(page, TUTORA.topicos),
  };
}

/**
 * Todas as sessões que a tutora já registrou, da mais recente para a mais antiga.
 *
 * O valor de cada uma sai da mentoria da mentorada atendida — My Partner e
 * Pronta Para Fazer Dinheiro pagam diferente. Se um dia existir uma propriedade
 * `Valor` na base Hands-off, ela manda: caso a caso sempre vence a tabela.
 */
export async function sessoesDaTutora(tutoraPageId: string): Promise<Sessao[]> {
  const dbId = await resolverDatabaseId('handsoff');
  const [linhas, mentoradas] = await Promise.all([
    queryDatabase(dbId, {
      filter: { property: HANDSOFF.feitoPelaTutora, relation: { contains: tutoraPageId } },
      sorts: [{ property: HANDSOFF.dataDaSessao, direction: 'descending' }],
    }),
    carteiraDaTutora(tutoraPageId),
  ]);

  const mentoriaPor = new Map(mentoradas.map((m) => [m.id, m.mentoria]));

  return linhas.map((p) => {
    const ids = relationIds(p, HANDSOFF.mentorada);
    const mentoria = ids.map((id) => mentoriaPor.get(id)).find(Boolean) ?? '';

    return {
      id: p.id,
      titulo: texto(p, HANDSOFF.nome),
      data: data(p, HANDSOFF.dataDaSessao),
      mentoradaIds: ids,
      valor: numero(p, HANDSOFF.valor) ?? valorDaSessao(mentoria),
    };
  });
}

/** `null` quando a mentoria não casa com nenhuma regra — melhor do que chutar. */
export function valorDaSessao(mentoria: string): number | null {
  const alvo = mentoria.toLowerCase();
  return VALOR_POR_SESSAO.find((r) => alvo.includes(r.contem))?.valor ?? null;
}

/** Agrupa por mês, do mais recente para o mais antigo. */
export function porMes(sessoes: Sessao[]): MesDeSessoes[] {
  const mapa = new Map<string, { sessoes: number; valor: number | null }>();

  for (const s of sessoes) {
    if (!s.data) continue;
    const chave = s.data.slice(0, 7);
    const atual = mapa.get(chave) ?? { sessoes: 0, valor: null };
    atual.sessoes += 1;
    if (s.valor !== null) atual.valor = (atual.valor ?? 0) + s.valor;
    mapa.set(chave, atual);
  }

  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([chave, v]) => ({ chave, rotulo: rotuloDoMes(chave), ...v }));
}

function rotuloDoMes(chave: string): string {
  const [ano, mes] = chave.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, 1));
  const nome = d.toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' });
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/**
 * Há quanto tempo a tutora atua, contado da primeira sessão registrada.
 *
 * Não é a data de entrada dela na La Fortuna — isso não existe no Notion. É o
 * que dá para afirmar com os dados que existem, e a tela diz exatamente isso.
 */
export function desdeAPrimeiraSessao(sessoes: Sessao[]): { desde: string; meses: number } | null {
  const datas = sessoes.map((s) => s.data).filter((d): d is string => Boolean(d));
  if (datas.length === 0) return null;

  const primeira = datas.reduce((a, b) => (a < b ? a : b));
  const d = new Date(primeira);
  const hoje = new Date();
  const meses =
    (hoje.getFullYear() - d.getFullYear()) * 12 + (hoje.getMonth() - d.getMonth());

  return { desde: primeira, meses: Math.max(0, meses) };
}

export function emReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
