import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  CircleDot,
  Flag,
  LayoutGrid,
  ListChecks,
  Percent,
  PiggyBank,
  Target,
  TrendingUp,
} from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { planejamento } from '@/lib/notion/mentorada';
import { progressoDaMentoria } from '@/lib/notion/jornada';
import { gestaoDeResultados, type GestaoDeResultados } from '@/lib/notion/gestao';
import { tarefasDaMentorada } from '@/lib/notion/tarefas';
import { AvisoNotion } from '@/components/AvisoNotion';
import { ObjetivosPorAno } from '@/components/TabelaObjetivos';
import { iniciais } from '@/lib/iniciais';
import { Bloco, Grupo } from '@/components/area-mentorada/Bloco';
import { CartoesDaArea } from '@/components/area-mentorada/CartoesDaArea';
import { DonutTutoras } from '@/components/area-mentorada/DonutTutoras';
import { montarFatias } from '@/components/area-mentorada/fatias';
import { GraficoVazio } from '@/components/area-mentorada/GraficoVazio';
import { GraficoBarras } from '@/components/area-mentorada/GraficoBarras';
import { anoPrincipal } from '@/components/area-mentorada/financeiro';
import { LinhaDoTempo } from '@/components/area-mentorada/LinhaDoTempo';
import { Tarefas } from '@/components/area-mentorada/Tarefas';
import { MESES, TRIMESTRES } from '@/components/area-mentorada/eixos';

export const dynamic = 'force-dynamic';

/**
 * A área de membros de uma mentorada — a mesma estrutura da página dela no
 * Notion. O que já tem base ligada (sessões, planejamento) vem ao vivo; o resto
 * é a moldura pronta, esperando a fonte.
 */
export default async function AreaDaMentoradaPage({
  params,
}: {
  params: Promise<{ mentoradaId: string }>;
}) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const [progresso, plano, gestao, tarefas] = await Promise.all([
    progressoDaMentoria(mentorada).catch(() => null),
    planejamento(mentorada).catch((e) => e as Error),
    // Falhar aqui só apaga os gráficos; o resto da página continua de pé.
    gestaoDeResultados(mentorada.id).catch(() => null),
    tarefasDaMentorada(mentorada.id).catch(() => null),
  ]);

  const ano = String(new Date().getFullYear());
  const fatias = progresso
    ? montarFatias(progresso.porTutora.realizadas, progresso.porTutora.aRealizar)
    : null;

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

      <header className="mb-8">
        <h1 className="display text-3xl leading-tight sm:text-4xl">
          La Fortuna Academy <span className="text-destaque">&amp;</span> {mentorada.nome}
        </h1>
        <p className="mt-3 text-lg text-marca">
          Seja bem-vinda, <em className="display text-xl font-semibold">bem-sucedida!</em>
        </p>
        <p className="mt-2 border-l-2 border-destaque pl-3 text-sm text-texto-suave">
          Aqui é onde a líder se mantém e alcança a evolução.
        </p>
      </header>

      <div className="space-y-4">
        <Bloco
          icone={CircleDot}
          titulo="Progresso da mentoria"
          descricao="Tudo o que já foi realizado no seu processo de mentoria e o que está por vir."
          acao={progresso ? <span className="text-xs whitespace-nowrap text-texto-suave">{progresso.ciclo}</span> : undefined}
        >
          {progresso ? (
            <>
              <div className="grid gap-8 py-2 sm:grid-cols-2">
                <DonutTutoras rotulo="Realizadas" fatias={fatias!.realizadas} />
                <DonutTutoras rotulo="A realizar" fatias={fatias!.aRealizar} />
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
            <p className="py-6 text-center text-sm text-texto-suave">
              Não foi possível carregar as sessões agora.
            </p>
          )}
        </Bloco>

        <Bloco icone={LayoutGrid} titulo="Área da mentorada">
          <CartoesDaArea mentoradaId={mentorada.id} />
        </Bloco>

        <Bloco icone={Target} titulo="Planejamento estratégico">
          <div className="mb-4 inline-flex items-center gap-3 rounded-xl border border-borda bg-fundo px-4 py-3">
            <Target aria-hidden size={16} className="text-marca" />
            <div>
              <p className="text-sm font-medium">Cenário atual × Cenário desejado</p>
              <p className="text-xs text-texto-suave">{ano} · em breve</p>
            </div>
          </div>

          <div className="rounded-xl bg-marca-suave/60 p-3 sm:p-4">
            <p className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-marca">
              <Flag aria-hidden size={14} />
              Objetivos | cenário desejado
            </p>
            {plano instanceof Error ? (
              <AvisoNotion erro={plano} detalhar={sessao.real.is_admin} />
            ) : plano === null ? (
              <p className="rounded-xl border border-dashed border-borda bg-superficie px-4 py-6 text-center text-sm text-texto-suave">
                Os objetivos ainda não estão ligados à área desta mentorada.
              </p>
            ) : (
              <ObjetivosPorAno objetivos={plano} />
            )}
          </div>
        </Bloco>

        <div id="tarefas" className="scroll-mt-6">
        <Bloco icone={ListChecks} titulo="Tarefas da mentoria">
          {tarefas ? (
            <Tarefas
              mentoradaId={mentorada.id}
              tarefas={tarefas.map((t) => ({
                id: t.id,
                tarefa: t.tarefa,
                prazo: t.prazo ? t.prazo.slice(0, 10).split('-').reverse().join('/') : '',
                observacoes: t.observacoes,
                feita: t.feita,
              }))}
            />
          ) : (
            <p className="py-6 text-center text-sm text-texto-suave">
              Não foi possível carregar as tarefas agora.
            </p>
          )}
        </Bloco>
        </div>
      </div>

      <h2 className="display mt-16 text-3xl text-marca">Dashboard Bem-Sucedida</h2>

      <Grupo titulo="Marcos & Conquistas">
        <Bloco icone={Flag} titulo="Linha do tempo">
          <LinhaDoTempo marcos={gestao?.marcos} />
        </Bloco>
      </Grupo>

      {gestao ? (
        <DashboardFinanceiro gestao={gestao} />
      ) : (
        <DashboardVazio ano={ano} />
      )}
    </div>
  );
}

/** Os gráficos do Dashboard, lidos das mesmas bases da Gestão de resultados. */
function DashboardFinanceiro({ gestao }: { gestao: GestaoDeResultados }) {
  const ano = anoPrincipal(gestao, String(new Date().getFullYear()));

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
      <Grupo titulo="Faturamento">
        <GraficoBarras icone={TrendingUp} titulo="Faturamento mensal" periodo={ano} formato="reais" pontos={porMes('faturamento')} />
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoBarras
            icone={TrendingUp}
            titulo="Faturamento trimestral"
            periodo={ano}
            formato="reais"
            pontos={trimestres.map((t) => ({ rotulo: t.rotulo, valor: t.item?.faturamento ?? null }))}
            className="lg:col-span-2"
          />
          <GraficoBarras icone={TrendingUp} titulo="Faturamento anual" formato="reais" pontos={porAno('faturamento')} />
        </div>
      </Grupo>

      <Grupo titulo="Lucro">
        <GraficoBarras icone={PiggyBank} titulo="Lucro mensal" periodo={ano} formato="reais" pontos={porMes('lucroComInvestimento')} />
        <GraficoBarras
          icone={PiggyBank}
          titulo="Lucro trimestral"
          periodo={ano}
          formato="reais"
          pontos={trimestres.map((t) => ({ rotulo: t.rotulo, valor: t.item?.lucro ?? null }))}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <GraficoBarras icone={PiggyBank} titulo="Lucro anual" formato="reais" pontos={porAno('lucro')} />
          <GraficoBarras icone={Percent} titulo="Lucro anual (%)" formato="percentual" pontos={porAno('percentualLucro')} />
        </div>
      </Grupo>
    </>
  );
}

/** Mentorada ainda no modelo antigo: a moldura dos gráficos, sem dados. */
function DashboardVazio({ ano }: { ano: string }) {
  return (
    <>
      <Grupo titulo="Faturamento">
        <GraficoVazio icone={TrendingUp} titulo="Faturamento mensal" periodo={ano} eixo={MESES} />
        <div className="grid gap-4 lg:grid-cols-3">
          <GraficoVazio
            icone={TrendingUp}
            titulo="Faturamento trimestral"
            periodo={ano}
            eixo={TRIMESTRES}
            className="lg:col-span-2"
          />
          <GraficoVazio icone={TrendingUp} titulo="Faturamento anual" eixo={[ano]} />
        </div>
      </Grupo>

      <Grupo titulo="Lucro">
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
