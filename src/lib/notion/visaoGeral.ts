import 'server-only';
import type { Mentorada } from './carteira';
import { TUTORIA_A_REALIZAR, TUTORIA_REALIZADA, cicloAtual } from './config';
import { mentoradasDoModeloNovo } from './modelo';
import { anoDaSessao, sessoesPorCiclo } from './sessoesDaMentorada';
import { tarefasDaMentorada } from './tarefas';

/**
 * A Visão geral da área das mentoradas: quem precisa do time e em que ponto
 * cada uma está no ciclo atual. Só lê, das mesmas bases das páginas de cada
 * mentorada (sessões e tarefas).
 *
 * Níveis:
 * - Crítico: 3 ou mais tarefas atrasadas, ou 45 dias ou mais sem sessão realizada.
 * - Atenção: alguma tarefa atrasada, 30 dias ou mais sem sessão, sessão com data
 *   prevista vencida e ainda a realizar, ou tutoria a realizar sem tutora.
 * - Em dia: nada disso.
 */

export const DIAS_ATENCAO = 30;
export const DIAS_CRITICO = 45;
export const TAREFAS_CRITICO = 3;

export type Nivel = 'critico' | 'atencao' | 'em-dia';

export type ResumoDaMentorada = {
  mentorada: Pick<Mentorada, 'id' | 'nome' | 'foto' | 'mentoria'>;
  nivel: Nivel;
  motivos: string[];
  realizadas: number;
  aRealizar: number;
  total: number;
  tarefasAtrasadas: number;
  tarefasPendentes: number;
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

export async function visaoGeral(): Promise<VisaoGeral> {
  const mentoradas = await mentoradasDoModeloNovo();
  const hoje = hojeEmSaoPaulo();
  const ano = hoje.slice(0, 4);

  const resumos: ResumoDaMentorada[] = [];
  for (let i = 0; i < mentoradas.length; i += EM_PARALELO) {
    resumos.push(...(await Promise.all(mentoradas.slice(i, i + EM_PARALELO).map((m) => resumir(m, hoje, ano)))));
  }

  const peso: Record<Nivel, number> = { critico: 0, atencao: 1, 'em-dia': 2 };
  resumos.sort((a, b) => peso[a.nivel] - peso[b.nivel] || a.mentorada.nome.localeCompare(b.mentorada.nome, 'pt-BR'));
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

  const ultimaSessao =
    (sessoes?.sessoes ?? [])
      .filter((s) => s.status === TUTORIA_REALIZADA && s.dataRealizada)
      .map((s) => s.dataRealizada!.slice(0, 10))
      .sort()
      .at(-1) ?? null;
  const diasSemSessao = ultimaSessao ? diasEntre(ultimaSessao, hoje) : null;

  const pendentes = (tarefas ?? []).filter((t) => !t.feita);
  const atrasadas = pendentes.filter((t) => t.prazo && t.prazo.slice(0, 10) < hoje);
  const vencidas = aRealizar.filter((s) => s.dataPrevista && s.dataPrevista.slice(0, 10) < hoje);
  const semTutora = aRealizar.filter((s) => /^tutoria/i.test(s.sessao.trim()) && s.tutoraIds.length === 0);

  const motivos: string[] = [];
  if (atrasadas.length) motivos.push(`${atrasadas.length} ${atrasadas.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`);
  if (diasSemSessao !== null && diasSemSessao >= DIAS_ATENCAO) motivos.push(`${diasSemSessao} dias sem sessão realizada`);
  if (vencidas.length) motivos.push(`${vencidas.length} ${vencidas.length === 1 ? 'sessão prevista já passou' : 'sessões previstas já passaram'} e segue a realizar`);
  if (semTutora.length) motivos.push(`${semTutora.length} ${semTutora.length === 1 ? 'tutoria sem tutora definida' : 'tutorias sem tutora definida'}`);

  const critico = atrasadas.length >= TAREFAS_CRITICO || (diasSemSessao !== null && diasSemSessao >= DIAS_CRITICO);
  const nivel: Nivel = critico ? 'critico' : motivos.length ? 'atencao' : 'em-dia';

  return {
    mentorada: { id: m.id, nome: m.nome, foto: m.foto, mentoria: m.mentoria },
    nivel,
    motivos,
    realizadas: realizadas.length,
    aRealizar: aRealizar.length,
    total: doCiclo.length,
    tarefasAtrasadas: atrasadas.length,
    tarefasPendentes: pendentes.length,
    ultimaSessao,
    diasSemSessao,
    incompleto: sessoes === null || tarefas === null,
  };
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}
