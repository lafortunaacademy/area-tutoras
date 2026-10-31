import 'server-only';
import type { Mentorada } from './carteira';
import { BRIEFINGS, HANDSOFF, TUTORIA_A_REALIZAR, TUTORIA_REALIZADA } from './config';
import { queryDatabase } from './client';
import { relationIds } from './props';
import { resolverDatabaseId } from './resolver';
import { normalizarId } from './carteira';
import { cicloMaisRecente } from './sessoesDaMentorada';
import { mentoradasDoModeloNovo } from './modelo';
import { sessoesPorCiclo } from './sessoesDaMentorada';
import { tarefasDaMentorada } from './tarefas';

/**
 * A Visão geral da área das mentoradas: quem precisa agendar sessão e em que
 * ponto cada uma está no ciclo atual. Só lê, das mesmas bases das páginas de
 * cada mentorada (sessões e tarefas).
 *
 * A conta do mês: cada mentorada precisa ter, no mês corrente, pelo menos uma
 * tutoria e uma sessão com a Fernanda — realizada ou já marcada. O que faltar
 * aparece como "para agendar".
 *
 * Precisa agendar: ainda tem sessão a realizar no ciclo, mas nenhuma agendada —
 * nem com status "Agendado", nem com data prevista de hoje em diante.
 */

export type ResumoDaMentorada = {
  mentorada: Pick<Mentorada, 'id' | 'nome' | 'foto' | 'mentoria' | 'situacao' | 'corSituacao'>;
  precisaAgendar: boolean;
  /** O que falta no mês: tutoria (com as tutoras), sessão (com a Fernanda) ou as duas. */
  faltaAgendar: ('tutoria' | 'sessao')[];
  /** As sessões que o Notion já marcou como "Agendar": a fila de marcação dela. */
  paraAgendar: { sessao: string; tipo: string; mes: string }[];
  /** Tutorias já dadas sem o hands-off escrito, com a data e quem deu. */
  semHandsOff: { sessao: string; tutora: string; data: string }[];
  /**
   * Tutoras com tutoria marcada para quem a Fernanda ainda não escreveu o
   * briefing. O briefing é da tutora, não da sessão: uma tutora com duas
   * tutorias marcadas aparece uma vez só.
   */
  semBriefing: string[];
  /** A primeira sessão a realizar do ciclo, na ordem da lista de sessões. */
  proximaAAgendar: string | null;
  realizadas: number;
  aRealizar: number;
  total: number;
  tarefasAtrasadas: number;
  /** "2026-09-10", a sessão realizada mais recente com data. */
  ultimaSessao: string | null;
  diasSemSessao: number | null;
  /** O ciclo dela: o mais recente marcado nas sessões da mentorada. */
  ciclo: string;
  /** Não foi possível ler algo desta mentorada agora. */
  incompleto: boolean;
};

export type VisaoGeral = {
  /** O ciclo mais recente do controle, só para dizer de onde a visão fala. */
  ciclo: string;
  mentoradas: ResumoDaMentorada[];
};

const EM_PARALELO = 3;
const AGENDADO = 'Agendado';
/** O status com que a Fernanda marca, no Notion, a sessão que ainda precisa de data. */
const AGENDAR = 'Agendar';

export async function visaoGeral(): Promise<VisaoGeral> {
  const mentoradas = await mentoradasDoModeloNovo();
  const hoje = hojeEmSaoPaulo();
  const ciclo = await cicloMaisRecente();
  const [briefings, handsOff] = await Promise.all([
    paresComBriefing().catch(() => new Set<string>()),
    handsOffPorMentorada().catch(() => new Map<string, number>()),
  ]);

  const resumos: ResumoDaMentorada[] = [];
  for (let i = 0; i < mentoradas.length; i += EM_PARALELO) {
    resumos.push(
      ...(await Promise.all(
        mentoradas.slice(i, i + EM_PARALELO).map((m) => resumir(m, hoje, ciclo, briefings, handsOff)),
      )),
    );
  }

  // Sempre pela situação: em risco, depois atenção, depois fluindo (o resto no fim).
  // Na mesma situação, quem está há mais tempo sem sessão primeiro.
  resumos.sort(
    (a, b) =>
      pesoDaSituacao(a.mentorada.situacao) - pesoDaSituacao(b.mentorada.situacao) ||
      (b.diasSemSessao ?? Infinity) - (a.diasSemSessao ?? Infinity) ||
      a.mentorada.nome.localeCompare(b.mentorada.nome, 'pt-BR'),
  );
  return { ciclo, mentoradas: resumos };
}

/**
 * Quem já tem briefing, por par mentorada + tutora. Uma consulta só: olhar
 * briefing de uma em uma seria uma ida ao Notion por mentorada.
 */
async function paresComBriefing(): Promise<Set<string>> {
  const dbId = await resolverDatabaseId('briefings');
  const linhas = await queryDatabase(dbId, { limite: 500 });

  const pares = new Set<string>();
  for (const p of linhas) {
    for (const mentorada of relationIds(p, BRIEFINGS.mentorada)) {
      for (const tutora of relationIds(p, BRIEFINGS.paraATutora)) {
        pares.add(`${normalizarId(mentorada)}|${normalizarId(tutora)}`);
      }
    }
  }
  return pares;
}

/**
 * Quantos hands-off cada mentorada tem escritos. Uma consulta só, como os
 * briefings: olhar de uma em uma seria uma ida ao Notion por mentorada.
 */
async function handsOffPorMentorada(): Promise<Map<string, number>> {
  const dbId = await resolverDatabaseId('handsoff');
  const linhas = await queryDatabase(dbId, { limite: 1000 });

  const contagem = new Map<string, number>();
  for (const p of linhas) {
    for (const mentorada of relationIds(p, HANDSOFF.mentorada)) {
      const chave = normalizarId(mentorada);
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }
  return contagem;
}

async function resumir(
  m: Mentorada,
  hoje: string,
  cicloDoControle: string,
  briefings: Set<string>,
  handsOff: Map<string, number>,
): Promise<ResumoDaMentorada> {
  const [sessoes, tarefas] = await Promise.all([
    sessoesPorCiclo(m).catch(() => null),
    tarefasDaMentorada(m.id).catch(() => null),
  ]);

  // O ciclo é o dela, não o do controle: cada mentorada anda no seu ritmo, e
  // olhar um ciclo em que ela não tem nada mostraria uma tela de zeros.
  const ciclo = sessoes?.ciclos[0] ?? cicloDoControle;
  const doCiclo = (sessoes?.sessoes ?? []).filter((s) => s.ciclo === ciclo);
  const realizadas = doCiclo.filter((s) => s.status === TUTORIA_REALIZADA);
  const aRealizar = doCiclo.filter((s) => TUTORIA_A_REALIZAR.includes(s.status));
  const temHora = (s: (typeof aRealizar)[number]) =>
    s.status === AGENDADO || (s.dataPrevista !== null && s.dataPrevista.slice(0, 10) >= hoje);
  const agendada = aRealizar.some(temHora);

  // Quem marca cada coisa é gente diferente: a tutoria é com a tutora, o resto
  // (check-in, planejamento, call SOS) é com a Fernanda. E o combinado é uma de
  // cada por mês: a falta é apurada no mês corrente, separada por tipo.
  const ehTutoria = (s: { tipo: string }) => s.tipo.toLowerCase().startsWith('tutoria');
  const mes = hoje.slice(0, 7);
  const noMes = (s: { dataRealizada: string | null; dataPrevista: string | null }) =>
    s.dataRealizada?.startsWith(mes) || s.dataPrevista?.startsWith(mes);

  // A fila de marcação vem pronta do Notion: status "Agendar" quer dizer
  // exatamente isto, e é o que a Fernanda vê na base.
  const paraAgendar = doCiclo
    .filter((s) => s.status === AGENDAR)
    .map((s) => ({
      sessao: s.sessao || s.tipo,
      tipo: s.tipo,
      // O mês vem do que estiver preenchido: a data prevista manda, depois o
      // campo "Mês previsto". Sem nenhum dos dois, a sessão não tem quando.
      mes: s.dataPrevista?.slice(0, 7) || s.mesPrevisto || '',
    }));

  const faltaAgendar: ('tutoria' | 'sessao')[] = [];
  for (const [chave, dessas] of [
    ['tutoria', doCiclo.filter(ehTutoria)],
    ['sessao', doCiclo.filter((s) => !ehTutoria(s))],
  ] as const) {
    if (!dessas.some(noMes)) faltaAgendar.push(chave);
  }

  // Tutoria já marcada e sem briefing: é o que trava a tutora antes da sessão.
  // A Fernanda escreve o briefing para a tutora, uma vez, e não por sessão.
  const semBriefing = [
    ...new Set(
      aRealizar
        .filter((s) => ehTutoria(s) && temHora(s))
        .flatMap((s) =>
          s.equipe.filter((t) => !briefings.has(`${normalizarId(m.id)}|${normalizarId(t.id)}`)).map((t) => t.nome),
        ),
    ),
  ];

  const tutoriasDadas = realizadas
    .filter(ehTutoria)
    .sort((a, b) => (b.dataRealizada ?? '').localeCompare(a.dataRealizada ?? ''));

  const escritos = handsOff.get(normalizarId(m.id)) ?? 0;
  const semHandsOff = tutoriasDadas.slice(0, Math.max(0, tutoriasDadas.length - escritos)).map((s) => ({
    sessao: s.sessao || s.tipo,
    tutora: s.equipe[0]?.nome ?? s.tutoras[0] ?? '',
    data: s.dataRealizada?.slice(0, 10) ?? '',
  }));

  const ultimaSessao =
    (sessoes?.sessoes ?? [])
      .filter((s) => s.status === TUTORIA_REALIZADA && s.dataRealizada)
      .map((s) => s.dataRealizada!.slice(0, 10))
      .sort()
      .at(-1) ?? null;

  const atrasadas = (tarefas ?? []).filter((t) => !t.feita && t.prazo && t.prazo.slice(0, 10) < hoje);

  return {
    mentorada: { id: m.id, nome: m.nome, foto: m.foto, mentoria: m.mentoria, situacao: m.situacao, corSituacao: m.corSituacao },
    precisaAgendar: aRealizar.length > 0 && !agendada,
    faltaAgendar,
    paraAgendar,
    semBriefing,
    semHandsOff,
    proximaAAgendar: aRealizar[0]?.sessao || null,
    realizadas: realizadas.length,
    aRealizar: aRealizar.length,
    total: doCiclo.length,
    tarefasAtrasadas: atrasadas.length,
    ultimaSessao,
    diasSemSessao: ultimaSessao ? diasEntre(ultimaSessao, hoje) : null,
    ciclo,
    incompleto: sessoes === null || tarefas === null,
  };
}

function pesoDaSituacao(situacao: string): number {
  const s = situacao.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (s.includes('risco') || s.includes('crise')) return 0;
  if (s.includes('atencao')) return 1;
  if (s.includes('fluindo')) return 2;
  return 3;
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}
