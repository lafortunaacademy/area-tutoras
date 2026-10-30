import 'server-only';
import { cache } from 'react';
import { guardado } from './cache';
import { getPage, queryDatabase } from './client';
import { tutoriasDaTutora } from './tutorias';
import { resolverDatabaseId } from './resolver';
import { TUTORA, VALOR_POR_SESSAO } from './config';
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
  /** Mentoria da mentorada atendida ("My Partner", "Pronta Para Fazer Dinheiro"). */
  mentoria: string;
  /** Da tabela de preços, pela mentoria da mentorada atendida. */
  valor: number | null;
};

export type FatiaDeMentoria = {
  mentoria: string;
  sessoes: number;
  valor: number | null;
  valorEmReais: string | null;
};

export type MesDeSessoes = {
  /** `2026-09`, para ordenar sem ambiguidade. */
  chave: string;
  rotulo: string;
  sessoes: number;
  valor: number | null;
  /** Já em reais. Formatar no servidor evita mandar função para o cliente. */
  valorEmReais: string | null;
  /** O mês aberto por mentoria, na ordem de `mentoriasDe`. */
  porMentoria: FatiaDeMentoria[];
};

/** Rótulo de quem ficou sem mentoria preenchida no Notion. */
export const SEM_MENTORIA = 'Sem mentoria';

/** id da tutora -> nome, para rotular quem assinou cada hands-off. */
const nomesGuardados = guardado('nomes-tutoras', async (): Promise<[string, string][]> => {
  const dbId = await resolverDatabaseId('tutoras');
  const linhas = await queryDatabase(dbId, { limite: 200 });
  return linhas.map((p) => [p.id, texto(p, TUTORA.nome)]);
});

// O que fica guardado é uma lista: Mapa não sobrevive à ida e volta do cache.
export const nomesDasTutoras = cache(async (): Promise<Map<string, string>> => new Map(await nomesGuardados()));

export async function perfilDaTutora(tutoraPageId: string | null): Promise<PerfilTutora | null> {
  if (!tutoraPageId) return null;
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
 * Quem deu a sessão vem da relation `Tutoras`, e a mentoria vem do rollup da
 * própria linha — sem depender da carteira, que não cobre sessão sem mentorada
 * preenchida. O valor sai dessa mentoria.
 */
export async function sessoesDaTutora(tutoraPageId: string | null): Promise<Sessao[]> {
  const tutorias = await tutoriasDaTutora(tutoraPageId);

  return tutorias.map((t) => ({
    id: t.id,
    titulo: t.sessao,
    data: t.data,
    mentoradaIds: t.mentoradaIds,
    mentoria: t.mentoria.trim() || SEM_MENTORIA,
    valor: valorDaSessao(t.mentoria),
  }));
}

/** `null` quando a mentoria não casa com nenhuma regra — melhor do que chutar. */
export function valorDaSessao(mentoria: string): number | null {
  const alvo = mentoria.toLowerCase();
  return VALOR_POR_SESSAO.find((r) => alvo.includes(r.contem))?.valor ?? null;
}

/** Agrupa por mês, do mais recente para o mais antigo, e abre cada mês por mentoria. */
export function porMes(sessoes: Sessao[]): MesDeSessoes[] {
  const ordem = mentoriasDe(sessoes);
  const mapa = new Map<string, Map<string, { sessoes: number; valor: number | null }>>();

  for (const s of sessoes) {
    if (!s.data) continue;
    const chave = s.data.slice(0, 7);
    const mes = mapa.get(chave) ?? new Map();
    const atual = mes.get(s.mentoria) ?? { sessoes: 0, valor: null };
    atual.sessoes += 1;
    if (s.valor !== null) atual.valor = (atual.valor ?? 0) + s.valor;
    mes.set(s.mentoria, atual);
    mapa.set(chave, mes);
  }

  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([chave, mes]) => {
      const porMentoria = ordem
        .filter((m) => mes.has(m))
        .map((m) => {
          const v = mes.get(m)!;
          return { mentoria: m, sessoes: v.sessoes, valor: v.valor, valorEmReais: v.valor === null ? null : emReais(v.valor) };
        });
      const sessoesDoMes = porMentoria.reduce((t, f) => t + f.sessoes, 0);
      const valor = porMentoria.some((f) => f.valor !== null)
        ? porMentoria.reduce((t, f) => t + (f.valor ?? 0), 0)
        : null;
      return {
        chave,
        rotulo: rotuloDoMes(chave),
        sessoes: sessoesDoMes,
        valor,
        valorEmReais: valor === null ? null : emReais(valor),
        porMentoria,
      };
    });
}

/**
 * O mesmo mês a mês, adiantado em um mês: a tutora recebe as sessões de um mês
 * no mês seguinte. Então setembro vira "recebido em outubro".
 */
export function comoRecebimento(meses: MesDeSessoes[]): MesDeSessoes[] {
  return meses.map((m) => {
    const chave = mesSeguinte(m.chave);
    return { ...m, chave, rotulo: rotuloDoMes(chave) };
  });
}

/** "2026-12" -> "2027-01". */
export function mesSeguinte(chave: string): string {
  const [ano, mes] = chave.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** As mentorias que aparecem nas sessões, sempre na mesma ordem (a cor segue essa ordem). */
export function mentoriasDe(sessoes: Sessao[]): string[] {
  const nomes = [...new Set(sessoes.map((s) => s.mentoria))];
  // "Sem mentoria" por último; o resto em ordem alfabética, para a cor de cada
  // mentoria não mudar de uma tela para outra.
  return nomes
    .filter((m) => m !== SEM_MENTORIA)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .concat(nomes.includes(SEM_MENTORIA) ? [SEM_MENTORIA] : []);
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

/** "R$3.500,00": como a La Fortuna escreve, sem espaço depois do R$. */
export function emReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, '');
}
