import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  CircleDot,
  Flag,
  ListChecks,
  Percent,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import type { Mentorada } from '@/lib/notion/carteira';
import { planejamento } from '@/lib/notion/mentorada';
import { progressoDaMentoria } from '@/lib/notion/jornada';
import { gestaoDeResultados, type GestaoDeResultados } from '@/lib/notion/gestao';
import { tarefasDaMentorada } from '@/lib/notion/tarefas';
import { cartoesDeCenario } from '@/lib/notion/cenarios';
import { CartoesCenario } from '@/components/area-mentorada/CartoesCenario';
import { SessoesEmAbas } from '@/components/area-mentorada/SessoesEmAbas';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';
import { ciclosDoControle, sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { ordenarCiclos, SEM_TUTORA } from '@/lib/notion/config';
import { AvisoNotion } from '@/components/AvisoNotion';
import { ObjetivosPorAno } from '@/components/TabelaObjetivos';
import { iniciais } from '@/lib/iniciais';
import { Bloco, Grupo } from '@/components/area-mentorada/Bloco';
import { DonutTutoras } from '@/components/area-mentorada/DonutTutoras';
import { fatiasPorTipo, montarFatias } from '@/components/area-mentorada/fatias';
import { TutoriasPorMes } from '@/components/area-mentorada/TutoriasPorMes';
import { GraficoVazio } from '@/components/area-mentorada/GraficoVazio';
import { GraficoBarras } from '@/components/area-mentorada/GraficoBarras';
import { GraficoLinha } from '@/components/area-mentorada/GraficoLinha';
import { anoSelecionado, anosDisponiveis } from '@/components/area-mentorada/financeiro';
import { LinhaDoTempo } from '@/components/area-mentorada/LinhaDoTempo';
import { Tarefas } from '@/components/area-mentorada/Tarefas';
import { MESES, TRIMESTRES } from '@/components/area-mentorada/eixos';

export const dynamic = 'force-dynamic';

/**
 * A área de membros de uma mentorada — a mesma estrutura da página dela no
 * Notion, lida ao vivo.
 *
 * Cada seção é carregada por conta própria (Suspense): o topo aparece na hora e
 * cada bloco entra assim que a resposta dele chega do Notion, em vez de a página
 * inteira esperar pelo mais lento.
 */
export default async function AreaDaMentoradaPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string; ciclo?: string }>;
}) {
  const { mentoradaId } = await params;
  const visitante = await exigirAcessoAMentorada(mentoradaId);
  const { ano: anoPedido, ciclo: cicloPedido } = await searchParams;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  // Quem está na Pronta Para Fazer Dinheiro ganha a capa em taupe. Com as duas
  // mentorias, vale a My Partner — mesma regra do valor da sessão.
  const mentoria = mentorada.mentoria.toLowerCase();
  const capaPpfd = mentoria.includes('pronta para fazer dinheiro') && !mentoria.includes('my partner');

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/mentoradas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca lg:hidden"
      >
        <ArrowLeft aria-hidden size={14} />
        Mentoradas
      </Link>

      {/* Capa */}
      <div className="relative mb-16">
        {/* A estampa de monogramas da marca, montada a partir do "o sistema"
            do guia. Cores fixas: é a capa, não segue o tema. */}
        <div
          className="relative h-36 overflow-hidden rounded-2xl sm:h-44"
          style={
            capaPpfd
              ? { backgroundColor: '#af9b87', backgroundImage: 'url(/marca/estampa-ppfd.png)', backgroundSize: '120px 132px' }
              : { backgroundColor: '#4b3424', backgroundImage: 'url(/marca/estampa.png)', backgroundSize: '120px 132px' }
          }
        />

        <div className="absolute -bottom-12 left-6 size-24 overflow-hidden rounded-full border-4 border-fundo bg-marca-suave shadow-[var(--sombra)]">
          {mentorada.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mentorada.foto} alt="" className="size-full object-cover" />
          ) : (
            <span className="display flex size-full items-center justify-center text-2xl text-marca">
              {iniciais(mentorada.nome)}
            </span>
          )}
        </div>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-3xl leading-tight sm:text-4xl">{mentorada.nome}</h1>
          <p className="mt-3 text-lg text-marca">
            Seja bem-vinda, <em className="display text-xl font-semibold">bem-sucedida!</em>
          </p>
          <p className="mt-2 border-l-2 border-destaque pl-3 text-sm text-texto-suave">
            Aqui é onde a líder se mantém e alcança a evolução.
          </p>
        </div>

        {/* Os dois caminhos que saem da área dela: o HUB e o site da marca. */}
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-64">
          <Link
            href={`/mentoradas/${mentorada.id}/tutorias`}
            className="flex items-center justify-center gap-2 rounded-xl bg-marca px-4 py-2.5 text-xs font-medium tracking-wide text-marca-contraste uppercase transition hover:opacity-90"
          >
            <Users aria-hidden size={14} />
            Conheça o HUB de tutoras
          </Link>
          {/* Sem destino até o endereço do site ser definido. */}
          <span
            aria-disabled
            className="relative flex items-center justify-center rounded-xl border border-borda bg-superficie-2 px-4 py-2.5 text-xs font-medium tracking-wide text-texto-suave uppercase"
          >
            Universo La Fortuna
            <span className="absolute right-2 bottom-1 text-[8px] tracking-wide opacity-70">em breve</span>
          </span>
        </div>
      </header>

      <div className="space-y-4">
        {/* Os ids são as âncoras do menu lateral (layout de /mentoradas). */}
        <div id="progresso" className="scroll-mt-6">
          <Suspense fallback={<Carregando icone={CircleDot} titulo="Progresso da mentoria" altura="h-56" />}>
            <SecaoProgresso mentorada={mentorada} cicloPedido={cicloPedido} />
          </Suspense>
        </div>

        <div id="sessoes" className="scroll-mt-6">
          <Suspense fallback={<Carregando icone={Video} titulo="Sessões e tutorias" altura="h-48" />}>
            <SecaoSessoes mentorada={mentorada} cicloPedido={cicloPedido} detalhar={visitante.admin} />
          </Suspense>
        </div>

        <div id="planejamento" className="scroll-mt-6">
          <Suspense fallback={<Carregando icone={Target} titulo="Planejamento estratégico" altura="h-48" />}>
            <SecaoPlanejamento mentorada={mentorada} detalhar={visitante.admin} />
          </Suspense>
        </div>

        <div id="tarefas" className="scroll-mt-6">
          <Suspense fallback={<Carregando icone={ListChecks} titulo="Tarefas da mentoria" altura="h-32" />}>
            <SecaoTarefas mentoradaId={mentorada.id} />
          </Suspense>
        </div>
      </div>

      <h2 id="dashboard" className="display mt-16 scroll-mt-6 text-3xl text-marca">Dashboard Bem-Sucedida</h2>

      <Suspense
        fallback={
          <Grupo titulo="Marcos & Conquistas">
            <Carregando icone={Flag} titulo="Linha do tempo" altura="h-32" />
          </Grupo>
        }
      >
        <SecaoDashboard mentoradaId={mentorada.id} anoPedido={anoPedido} />
      </Suspense>
    </div>
  );
}

/** Espaço do bloco enquanto a seção chega: mesmo título, corpo pulsando. */
function Carregando({ icone, titulo, altura }: { icone: typeof CircleDot; titulo: string; altura: string }) {
  return (
    <Bloco icone={icone} titulo={titulo}>
      <div aria-hidden className={`${altura} animate-pulse rounded-xl bg-superficie-2/70`} />
      <span className="sr-only">Carregando…</span>
    </Bloco>
  );
}

async function SecaoProgresso({ mentorada, cicloPedido }: { mentorada: Mentorada; cicloPedido?: string }) {
  const { todos, dela } = await ciclos(mentorada);
  const ciclo = cicloEscolhido(todos, dela, cicloPedido);
  const [progresso, dados] = await Promise.all([
    progressoDaMentoria(mentorada, ciclo).catch(() => null),
    sessoesPorCiclo(mentorada).catch(() => null),
  ]);
  const fatias = progresso ? montarFatias(progresso.porTutora.realizadas, progresso.porTutora.aRealizar) : null;
  // O terceiro gráfico: as realizadas do ciclo, mês a mês, com a cor de cada tutora.
  const porMes = fatias ? realizadasPorMes(dados?.sessoes ?? [], ciclo, fatias.realizadas) : [];

  return (
    <Bloco
      icone={CircleDot}
      titulo="Progresso da mentoria"
      descricao="Tudo o que já foi realizado no seu processo de mentoria e o que está por vir."
      acao={
        <SeletorDeAno
          anos={todos}
          selecionado={ciclo}
          caminho={`/mentoradas/${mentorada.id}`}
          parametro="ciclo"
          ancora="progresso"
          mesmoComUm
        />
      }
    >
      {progresso && fatias ? (
        <>
          <div className="grid gap-10 py-2 lg:grid-cols-3">
            {/* A legenda sai daqui: a cor de cada tutora é a mesma nas duas roscas. */}
            <DonutTutoras rotulo="Realizadas" fatias={fatias.realizadas} legenda={false} />
            {/* "A realizar" agrupa por tipo de sessão (a propriedade "Sessão "). */}
            <DonutTutoras rotulo="A realizar" fatias={fatiasPorTipo(progresso.porTipo.aRealizar)} />
            <div>
              <p className="mb-3 w-fit rounded-full bg-marca-suave px-3 py-1 text-xs font-medium text-marca">
                Tutorias realizadas
              </p>
              <TutoriasPorMes meses={porMes} />
            </div>
          </div>
          {progresso.proxima ? (
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-borda pt-4 text-sm">
              <CalendarClock aria-hidden size={15} className="text-marca" />
              <span className="text-texto-suave">Próxima sessão:</span>
              <span className="font-medium">{progresso.proxima.sessao}</span>
              <span className="text-texto-suave">· {progresso.proxima.data}</span>
            </p>
          ) : null}
        </>
      ) : (
        <p className="py-6 text-center text-sm text-texto-suave">Não foi possível carregar as sessões agora.</p>
      )}
    </Bloco>
  );
}

async function SecaoSessoes({
  mentorada,
  cicloPedido,
  detalhar,
}: {
  mentorada: Mentorada;
  cicloPedido?: string;
  detalhar: boolean;
}) {
  const dados = await sessoesPorCiclo(mentorada).catch((e) => e as Error);
  const { todos, dela } = await ciclos(mentorada);
  const ciclo = cicloEscolhido(todos, dela, cicloPedido);
  const sessoes = dados instanceof Error ? dados : dados.sessoes.filter((s) => s.ciclo === ciclo);

  return (
    <Bloco
      icone={Video}
      titulo="Sessões e tutorias"
      descricao="As sessões do ciclo, separadas entre quem conduz."
      acao={<span className="text-xs whitespace-nowrap text-texto-suave">{ciclo}</span>}
    >
      {sessoes instanceof Error ? (
        <AvisoNotion erro={sessoes} detalhar={detalhar} />
      ) : (
        <SessoesEmAbas key={ciclo} mentoradaId={mentorada.id} sessoes={sessoes} dona="Fernanda" />
      )}
    </Bloco>
  );
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * As sessões realizadas do ciclo, agrupadas por mês e por tutora. Só os meses
 * que têm alguma coisa, do mais antigo para o mais recente.
 */
function realizadasPorMes(
  sessoes: { ciclo: string; realizada: boolean; dataRealizada: string | null; tutoras: string[] }[],
  ciclo: string,
  fatias: { rotulo: string; cor: string }[],
) {
  const cor = new Map(fatias.map((f) => [f.rotulo, f.cor]));
  const porMes = new Map<string, Map<string, number>>();

  for (const s of sessoes) {
    if (s.ciclo !== ciclo || !s.realizada || !s.dataRealizada) continue;
    const mes = s.dataRealizada.slice(0, 7);
    const tutoras = s.tutoras.length ? s.tutoras : [SEM_TUTORA];
    const doMes = porMes.get(mes) ?? new Map<string, number>();
    for (const t of tutoras) doMes.set(t, (doMes.get(t) ?? 0) + 1);
    porMes.set(mes, doMes);
  }

  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, tutoras]) => ({
      rotulo: `${MESES_CURTOS[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`,
      porTutora: [...tutoras.entries()]
        .map(([tutora, total]) => ({ rotulo: tutora, total, cor: cor.get(tutora) ?? 'var(--serie-sem)' }))
        .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo)),
    }));
}

/** Os ciclos que viram botão (todos os do controle) e os que ela de fato teve. */
async function ciclos(mentorada: Mentorada): Promise<{ todos: string[]; dela: string[] }> {
  const [doControle, dela] = await Promise.all([
    ciclosDoControle().catch(() => [] as string[]),
    sessoesPorCiclo(mentorada)
      .then((d) => d.ciclos)
      .catch(() => [] as string[]),
  ]);
  return { todos: ordenarCiclos([...new Set([...doControle, ...dela])]), dela: ordenarCiclos(dela) };
}

/**
 * O ciclo aberto: o pedido no endereço; senão o mais recente em que ela TEM
 * sessão — abrir no último ciclo criado mostraria uma tela vazia para quem
 * ainda está no ciclo anterior.
 */
function cicloEscolhido(todos: string[], dela: string[], pedido?: string): string {
  if (pedido && todos.includes(pedido)) return pedido;
  return dela[0] ?? todos[0] ?? '';
}

async function SecaoPlanejamento({ mentorada, detalhar }: { mentorada: Mentorada; detalhar: boolean }) {
  const [plano, cenarios] = await Promise.all([
    planejamento(mentorada).catch((e) => e as Error),
    cartoesDeCenario(mentorada.id).catch(() => null),
  ]);

  return (
    <Bloco icone={Target} titulo="Planejamento estratégico">
      {/* Um cartão por ano, do Notion; o mais recente primeiro. Abre por cima da página. */}
      {cenarios && cenarios.length > 0 ? (
        <CartoesCenario mentoradaId={mentorada.id} cartoes={cenarios} />
      ) : (
        <p className="mb-4 w-fit rounded-xl border border-dashed border-borda px-4 py-3 text-sm text-texto-suave">
          {cenarios ? 'Nenhum cenário cadastrado ainda.' : 'Não foi possível carregar os cenários agora.'}
        </p>
      )}

      <div className="rounded-xl bg-marca-suave/60 p-3 sm:p-4">
        <p className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-marca">
          <Flag aria-hidden size={14} />
          Objetivos | cenário desejado
        </p>
        {plano instanceof Error ? (
          <AvisoNotion erro={plano} detalhar={detalhar} />
        ) : plano === null ? (
          <p className="rounded-xl border border-dashed border-borda bg-superficie px-4 py-6 text-center text-sm text-texto-suave">
            Os objetivos ainda não estão ligados à área desta mentorada.
          </p>
        ) : (
          <ObjetivosPorAno objetivos={plano} />
        )}
      </div>
    </Bloco>
  );
}

async function SecaoTarefas({ mentoradaId }: { mentoradaId: string }) {
  const tarefas = await tarefasDaMentorada(mentoradaId).catch(() => null);

  return (
    <Bloco icone={ListChecks} titulo="Tarefas da mentoria">
      {tarefas ? (
        <Tarefas
          mentoradaId={mentoradaId}
          tarefas={tarefas.map((t) => ({
            id: t.id,
            tarefa: t.tarefa,
            prazo: t.prazo ? t.prazo.slice(0, 10).split('-').reverse().join('/') : '',
            observacoes: t.observacoes,
            feita: t.feita,
          }))}
        />
      ) : (
        <p className="py-6 text-center text-sm text-texto-suave">Não foi possível carregar as tarefas agora.</p>
      )}
    </Bloco>
  );
}

async function SecaoDashboard({ mentoradaId, anoPedido }: { mentoradaId: string; anoPedido?: string }) {
  // Falhar aqui só apaga os gráficos; o resto da página continua de pé.
  const gestao = await gestaoDeResultados(mentoradaId).catch(() => null);

  return (
    <>
      <div id="marcos" className="scroll-mt-6">
        <Grupo titulo="Marcos & Conquistas">
          <Bloco icone={Flag} titulo="Linha do tempo">
            <LinhaDoTempo marcos={gestao?.marcos} />
          </Bloco>
        </Grupo>
      </div>

      {gestao ? (
        <DashboardFinanceiro gestao={gestao} mentoradaId={mentoradaId} anoPedido={anoPedido} />
      ) : (
        <DashboardVazio ano={String(new Date().getFullYear())} />
      )}
    </>
  );
}

/** Os gráficos do Dashboard, lidos das mesmas bases da Gestão de resultados. */
function DashboardFinanceiro({
  gestao,
  mentoradaId,
  anoPedido,
}: {
  gestao: GestaoDeResultados;
  mentoradaId: string;
  anoPedido?: string;
}) {
  const ano = anoSelecionado(gestao, anoPedido);

  // Os gráficos mensais olham para o negócio; o pessoal fica na visão mensal
  // da Gestão de resultados.
  const negocio = gestao.meses.filter((m) => m.ano === ano && m.categoria.toLowerCase() === 'negócio');
  const porMes = (campo: 'faturamento' | 'lucroComInvestimento') =>
    MESES.map((rotulo, i) => ({ rotulo, valor: negocio.find((m) => m.ordem === i + 1)?.[campo] ?? null }));

  const trimestres = TRIMESTRES.map((rotulo, i) => ({
    rotulo,
    item: gestao.trimestres.find((t) => t.ano === ano && t.numero === i + 1),
  }));

  const anos = gestao.anos.length > 0 ? gestao.anos : null;
  const porAno = (campo: 'faturamento' | 'lucro' | 'percentualLucro') =>
    anos ? anos.map((a) => ({ rotulo: a.ano, valor: a[campo] })) : [{ rotulo: ano, valor: null }];

  return (
    <>
      <div className="mt-6">
        <SeletorDeAno anos={anosDisponiveis(gestao)} selecionado={ano} caminho={`/mentoradas/${mentoradaId}`} />
      </div>

      <Grupo id="faturamento" titulo="Faturamento">
        <GraficoLinha icone={TrendingUp} titulo="Faturamento mensal" tom="verde" periodo={ano} formato="reais" pontos={porMes('faturamento')} />
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoBarras
            icone={TrendingUp}
            titulo="Faturamento trimestral"
            tom="verde"
            periodo={ano}
            formato="reais"
            pontos={trimestres.map((t) => ({ rotulo: t.rotulo, valor: t.item?.faturamento ?? null }))}
            className="lg:col-span-2"
          />
          <GraficoBarras icone={TrendingUp} titulo="Faturamento anual" tom="verde" formato="reais" pontos={porAno('faturamento')} />
        </div>
      </Grupo>

      <Grupo id="lucro" titulo="Lucro">
        <GraficoLinha icone={PiggyBank} titulo="Lucro mensal" tom="azul" periodo={ano} formato="reais" pontos={porMes('lucroComInvestimento')} />
        <GraficoBarras
          icone={PiggyBank}
          titulo="Lucro trimestral"
          tom="azul"
          periodo={ano}
          formato="reais"
          pontos={trimestres.map((t) => ({ rotulo: t.rotulo, valor: t.item?.lucro ?? null }))}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoBarras icone={PiggyBank} titulo="Lucro anual" tom="azul" formato="reais" pontos={porAno('lucro')} />
          <GraficoBarras icone={Percent} titulo="Lucro anual (%)" tom="azul" formato="percentual" pontos={porAno('percentualLucro')} />
        </div>
      </Grupo>
    </>
  );
}

/** Mentorada ainda no modelo antigo: a moldura dos gráficos, sem dados. */
function DashboardVazio({ ano }: { ano: string }) {
  return (
    <>
      <Grupo id="faturamento" titulo="Faturamento">
        <GraficoVazio icone={TrendingUp} titulo="Faturamento mensal" periodo={ano} eixo={MESES} />
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoVazio icone={TrendingUp} titulo="Faturamento trimestral" periodo={ano} eixo={TRIMESTRES} className="lg:col-span-2" />
          <GraficoVazio icone={TrendingUp} titulo="Faturamento anual" eixo={[ano]} />
        </div>
      </Grupo>

      <Grupo id="lucro" titulo="Lucro">
        <GraficoVazio icone={PiggyBank} titulo="Lucro mensal" periodo={ano} eixo={MESES} />
        <GraficoVazio icone={PiggyBank} titulo="Lucro trimestral" periodo={ano} eixo={TRIMESTRES} />
        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoVazio icone={PiggyBank} titulo="Lucro anual" eixo={[ano]} />
          <GraficoVazio icone={Percent} titulo="Lucro anual (%)" eixo={[ano]} />
        </div>
      </Grupo>
    </>
  );
}
