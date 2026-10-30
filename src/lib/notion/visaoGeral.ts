import 'server-only';
import type { Mentorada } from './carteira';
import { TUTORIA_A_REALIZAR, TUTORIA_REALIZADA } from './config';
import { cicloMaisRecente } from './sessoesDaMentorada';
import { mentoradasDoModeloNovo } from './modelo';
import { sessoesPorCiclo } from './sessoesDaMentorada';
import { tarefasDaMentorada } from './tarefas';

/**
 * A Visão geral da área das mentoradas: quem precisa agendar sessão e em que
 * ponto cada uma está no ciclo atual. Só lê, das mesmas bases das páginas de
 * cada mentorada (sessões e tarefas).
 *
 * Precisa agendar: ainda tem sessão a realizar no ciclo, mas nenhuma agendada —
 * nem com status "Agendado", nem com data prevista de hoje em diante.
 */

export type ResumoDaMentorada = {
  mentorada: Pick<Mentorada, 'id' | 'nome' | 'foto' | 'mentoria' | 'situacao' | 'corSituacao'>;
  precisaAgendar: boolean;
  /** O que falta marcar: tutoria (com as tutoras), sessão (com a Fernanda) ou as duas. */
  faltaAgendar: ('tutoria' | 'sessao')[];
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

export async function visaoGeral(): Promise<VisaoGeral> {
  const mentoradas = await mentoradasDoModeloNovo();
  const hoje = hojeEmSaoPaulo();
  const ciclo = await cicloMaisRecente();

  const resumos: ResumoDaMentorada[] = [];
  for (let i = 0; i < mentoradas.length; i += EM_PARALELO) {
    resumos.push(...(await Promise.all(mentoradas.slice(i, i + EM_PARALELO).map((m) => resumir(m, hoje, ciclo)))));
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

async function resumir(m: Mentorada, hoje: string, cicloDoControle: string): Promise<ResumoDaMentorada> {
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
  // (check-in, planejamento, call SOS) é com a Fernanda. Por isso a falta é
  // apurada separada, pelo tipo da sessão.
  const ehTutoria = (s: (typeof aRealizar)[number]) => s.tipo.toLowerCase().startsWith('tutoria');
  const faltaAgendar: ('tutoria' | 'sessao')[] = [];
  for (const [chave, dessas] of [
    ['tutoria', aRealizar.filter(ehTutoria)],
    ['sessao', aRealizar.filter((s) => !ehTutoria(s))],
  ] as const) {
    if (dessas.length > 0 && !dessas.some(temHora)) faltaAgendar.push(chave);
  }

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
