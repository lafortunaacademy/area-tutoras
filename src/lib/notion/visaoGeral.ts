import 'server-only';
import type { Mentorada } from './carteira';
import { TUTORIA_A_REALIZAR, TUTORIA_REALIZADA, cicloAtual } from './config';
import { mentoradasDoModeloNovo } from './modelo';
import { anoDaSessao, sessoesPorCiclo } from './sessoesDaMentorada';
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
  mentorada: Pick<Mentorada, 'id' | 'nome' | 'foto' | 'mentoria' | 'status'>;
  precisaAgendar: boolean;
  /** A primeira sessão a realizar do ciclo, na ordem da lista de sessões. */
  proximaAAgendar: string | null;
  realizadas: number;
  aRealizar: number;
  total: number;
  tarefasAtrasadas: number;
  /** "2026-09-10", a sessão realizada mais recente com data. */
  ultimaSessao: string | null;
  diasSemSessao: number | null;
  /** Não foi possível ler algo desta mentorada agora. */
  incompleto: boolean;
};

export type VisaoGeral = {
  ciclo: string;
  mentoradas: ResumoDaMentorada[];
};

const EM_PARALELO = 3;
const AGENDADO = 'Agendado';

export async function visaoGeral(): Promise<VisaoGeral> {
  const mentoradas = await mentoradasDoModeloNovo();
  const hoje = hojeEmSaoPaulo();
  const ano = hoje.slice(0, 4);

  const resumos: ResumoDaMentorada[] = [];
  for (let i = 0; i < mentoradas.length; i += EM_PARALELO) {
    resumos.push(...(await Promise.all(mentoradas.slice(i, i + EM_PARALELO).map((m) => resumir(m, hoje, ano)))));
  }

  // Quem está há mais tempo sem sessão primeiro; sem data nenhuma, antes de todas.
  resumos.sort(
    (a, b) =>
      (b.diasSemSessao ?? Infinity) - (a.diasSemSessao ?? Infinity) ||
      a.mentorada.nome.localeCompare(b.mentorada.nome, 'pt-BR'),
  );
  return { ciclo: cicloAtual(), mentoradas: resumos };
}

async function resumir(m: Mentorada, hoje: string, ano: string): Promise<ResumoDaMentorada> {
  const [sessoes, tarefas] = await Promise.all([
    sessoesPorCiclo(m).catch(() => null),
    tarefasDaMentorada(m.id).catch(() => null),
  ]);

  const doCiclo = (sessoes?.sessoes ?? []).filter((s) => anoDaSessao(s) === ano);
  const realizadas = doCiclo.filter((s) => s.status === TUTORIA_REALIZADA);
  const aRealizar = doCiclo.filter((s) => TUTORIA_A_REALIZAR.includes(s.status));
  const agendada = aRealizar.some(
    (s) => s.status === AGENDADO || (s.dataPrevista !== null && s.dataPrevista.slice(0, 10) >= hoje),
  );

  const ultimaSessao =
    (sessoes?.sessoes ?? [])
      .filter((s) => s.status === TUTORIA_REALIZADA && s.dataRealizada)
      .map((s) => s.dataRealizada!.slice(0, 10))
      .sort()
      .at(-1) ?? null;

  const atrasadas = (tarefas ?? []).filter((t) => !t.feita && t.prazo && t.prazo.slice(0, 10) < hoje);

  return {
    mentorada: { id: m.id, nome: m.nome, foto: m.foto, mentoria: m.mentoria, status: m.status },
    precisaAgendar: aRealizar.length > 0 && !agendada,
    proximaAAgendar: aRealizar[0]?.sessao || null,
    realizadas: realizadas.length,
    aRealizar: aRealizar.length,
    total: doCiclo.length,
    tarefasAtrasadas: atrasadas.length,
    ultimaSessao,
    diasSemSessao: ultimaSessao ? diasEntre(ultimaSessao, hoje) : null,
    incompleto: sessoes === null || tarefas === null,
  };
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}
