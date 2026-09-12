import 'server-only';
import { cache } from 'react';
import { getPage, queryDatabase } from './client';
import { tutoriasDaTutora } from './tutorias';
import { resolverDatabaseId } from './resolver';
import { TUTORA, VALOR_POR_SESSAO } from './config';
import { carteiraDaTutora } from './carteira';
import { arquivoUrl, texto } from './props';

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
  /** Da tabela de preços, pela mentoria da mentorada atendida. */
  valor: number | null;
};

export type MesDeSessoes = {
  /** `2026-09`, para ordenar sem ambiguidade. */
  chave: string;
  rotulo: string;
  sessoes: number;
  valor: number | null;
  /** Já em reais. Formatar no servidor evita mandar função para o cliente. */
  valorEmReais: string | null;
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
 * As tutorias que a tutora já deu.
 *
 * Vêm do controle — "Acompanhamento de clientes" — e não dos hands-off. O
 * hands-off é o relato da sessão, escrito quando dá; o controle é onde a sessão
 * é marcada como realizada. Contar hands-off subestimaria o trabalho dela.
 *
 * O valor sai da mentoria da mentorada atendida: My Partner e Pronta Para Fazer
 * Dinheiro pagam diferente.
 */
export async function sessoesDaTutora(
  tutoraPageId: string,
  email: string,
): Promise<Sessao[]> {
  const [tutorias, mentoradas] = await Promise.all([
    tutoriasDaTutora(email),
    carteiraDaTutora(),
  ]);

  // A relation `Mentorada` do controle aponta para a página da cliente em "Área
  // clientes", não para a linha dela em "Área das tutoras". Indexar pelo ID
  // errado casa zero e faz todo valor virar null — foi o que aconteceu.
  const mentoriaPor = new Map<string, string>();
  for (const m of mentoradas) {
    for (const id of m.areaDaClienteIds) mentoriaPor.set(id, m.mentoria);
    mentoriaPor.set(m.id, m.mentoria);
  }

  return tutorias.map((t) => {
    const mentoria = t.mentoradaIds.map((id) => mentoriaPor.get(id)).find(Boolean) ?? '';
    return {
      id: t.id,
      titulo: t.sessao,
      data: t.data,
      mentoradaIds: t.mentoradaIds,
      valor: valorDaSessao(mentoria),
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
    .map(([chave, v]) => ({
      chave,
      rotulo: rotuloDoMes(chave),
      ...v,
      valorEmReais: v.valor === null ? null : emReais(v.valor),
    }));
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
