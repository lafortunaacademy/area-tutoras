import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { exigirVisitante } from '@/lib/session';
import { visaoGeral, type ResumoDaMentorada } from '@/lib/notion/visaoGeral';
import { AvisoNotion } from '@/components/AvisoNotion';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { iniciais } from '@/lib/iniciais';

export const dynamic = 'force-dynamic';

export default async function MentoradasPage() {
  const visitante = await exigirVisitante();
  // A mentorada não tem visão geral: vai direto para a própria área.
  if (!visitante.admin) redirect(`/mentoradas/${visitante.mentoradaId}`);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[12px] tracking-[0.14em] text-texto-suave uppercase">Área das mentoradas</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">Visão geral</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Quem precisa agendar sessão e em que ponto cada mentorada está no ciclo. Só as mentoradas do modelo novo.
      </p>

      <Suspense fallback={<Carregando />}>
        <Conteudo detalharErro={visitante.admin} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ detalharErro }: { detalharErro: boolean }) {
  let dados;
  try {
    dados = await visaoGeral();
  } catch (erro) {
    return (
      <div className="mt-8">
        <AvisoNotion erro={erro} detalhar={detalharErro} />
      </div>
    );
  }

  const { mentoradas } = dados;
  if (mentoradas.length === 0) {
    return <p className="mt-8 text-sm text-texto-suave">Nenhuma mentorada está na área de membros nova ainda.</p>;
  }

  const soma = (f: (m: ResumoDaMentorada) => number) => mentoradas.reduce((t, m) => t + f(m), 0);
  const aAgendar = soma((m) => m.paraAgendar.length);
  const briefings = soma((m) => m.semBriefing.length);
  // Na tabela entram os dois motivos: falta marcar ou falta o briefing de uma
  // tutoria já marcada.
  const alertas = mentoradas.filter(
    (m) => m.paraAgendar.length > 0 || m.faltaAgendar.length > 0 || m.semBriefing.length > 0,
  );

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Numero rotulo="Sessões a realizar" valor={soma((m) => m.aRealizar)} />
        {/* Os dois números que viram trabalho levam para a tabela que diz quais
            são, e já adiantam a lista quando o cursor passa por cima. */}
        <Numero
          rotulo="Sessões para agendar"
          valor={aAgendar}
          href="#alertas"
          dica={listar(mentoradas, (m) => m.paraAgendar.map((x) => x.sessao))}
        />
        <Numero
          rotulo="Briefings pendentes"
          valor={briefings}
          href="#alertas"
          dica={listar(mentoradas, (m) => m.semBriefing.map((b) => `${b.sessao} (${b.tutora})`))}
        />
      </ul>

      <Secao
        id="alertas"
        titulo="Alertas de acompanhamento"
        descricao="As sessões marcadas como Agendar no Notion, mais o combinado do mês: no mínimo uma tutoria e uma sessão com a Fernanda, realizadas ou marcadas. Quem tem tutoria marcada sem briefing também aparece."
      >
        {alertas.length === 0 ? (
          <p className="rounded-xl border border-borda bg-superficie px-4 py-6 text-center text-sm text-texto-suave">
            Nada esperando data: o mês de todas está fechado e os briefings, feitos.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-borda text-left">
                  {['Situação', 'Mentorada', 'O que falta marcar', 'Briefing', 'Última sessão'].map((c) => (
                    <th key={c} className="px-4 py-2.5 text-[12px] font-medium tracking-wide whitespace-nowrap text-texto-suave uppercase">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alertas.map((m) => (
                  <tr key={m.mentorada.id} className="border-b border-borda/60 last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <EtiquetaNotion
                        texto={m.mentorada.situacao || 'Sem situação'}
                        cor={m.mentorada.situacao ? m.mentorada.corSituacao : 'default'}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/mentoradas/${m.mentorada.id}/sessoes`} className="flex items-center gap-2.5 hover:text-marca">
                        <Retrato nome={m.mentorada.nome} foto={m.mentorada.foto} />
                        <span className="min-w-0">
                          <span className="block font-medium">{m.mentorada.nome}</span>
                          {m.mentorada.mentoria ? <span className="block text-xs text-texto-suave">{m.mentorada.mentoria}</span> : null}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {m.paraAgendar.length + m.faltaAgendar.length === 0 ? (
                          <span className="text-texto-suave">nada</span>
                        ) : null}
                        {/* O que o Notion já marcou como Agendar vem primeiro: é a fila real. */}
                        {m.paraAgendar.map((s, i) => (
                          <span
                            key={`${s.sessao}-${i}`}
                            className="inline-block rounded-full bg-andamento-suave px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-andamento"
                          >
                            {s.sessao}
                          </span>
                        ))}
                        {m.faltaAgendar.map((o) => (
                          <span
                            key={o}
                            className="inline-block rounded-full border border-borda px-2 py-0.5 text-[11.5px] whitespace-nowrap text-texto-suave"
                          >
                            sem {o === 'tutoria' ? 'tutoria' : 'sessão com a Fernanda'} no mês
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]">
                      {m.semBriefing.length === 0 ? (
                        <span className="text-texto-suave">em dia</span>
                      ) : (
                        m.semBriefing.map((b) => (
                          <span key={`${b.sessao}-${b.tutora}`} className="block whitespace-nowrap">
                            falta o de {b.tutora}
                            <span className="block text-xs text-texto-suave">{b.sessao}</span>
                          </span>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">
                      {m.ultimaSessao ? `${m.ultimaSessao.split('-').reverse().join('/')} · há ${m.diasSemSessao} dias` : ''}
                      {m.incompleto ? <span className="block text-xs">Parte dos dados não carregou agora.</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Onde cada mentorada está" descricao="Sessões realizadas no ciclo de cada uma, de todas as previstas.">
        <ul className="space-y-3 rounded-xl border border-borda bg-superficie p-4 sm:p-5">
          {/* Aqui a ordem é alfabética; nos alertas, pela situação. */}
          {[...mentoradas]
            .sort((a, b) => a.mentorada.nome.localeCompare(b.mentorada.nome, 'pt-BR'))
            .map((m) => (
              <li key={m.mentorada.id} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                <Link href={`/mentoradas/${m.mentorada.id}`} className="truncate hover:text-marca">
                  {m.mentorada.nome}
                </Link>
                <div
                  className="h-2 overflow-hidden rounded-full bg-superficie-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={m.total}
                  aria-valuenow={m.realizadas}
                  aria-label={`${m.mentorada.nome}: ${m.realizadas} de ${m.total} sessões`}
                >
                  <div className="h-full rounded-full bg-destaque" style={{ width: `${Math.round(fracao(m) * 100)}%` }} />
                </div>
                <span className="text-xs whitespace-nowrap text-texto-suave tabular-nums">
                  <span className="font-medium text-texto">{m.realizadas}</span> de {m.total}
                </span>
              </li>
            ))}
        </ul>
      </Secao>
    </>
  );
}

const fracao = (m: ResumoDaMentorada) => (m.total ? m.realizadas / m.total : 0);

/** Uma linha por mentorada, para o balão do cursor: "Teste: Pessoas, Planejamento". */
function listar(mentoradas: ResumoDaMentorada[], de: (m: ResumoDaMentorada) => string[]): string | undefined {
  const linhas = mentoradas
    .map((m) => [m.mentorada.nome, de(m)] as const)
    .filter(([, itens]) => itens.length > 0)
    .map(([nome, itens]) => `${nome}: ${itens.join(', ')}`);

  return linhas.length > 0 ? linhas.join('\n') : undefined;
}

function Numero({ rotulo, valor, href, dica }: { rotulo: string; valor: number; href?: string; dica?: string }) {
  const dentro = (
    <>
      <p className="text-[11.5px] tracking-[0.12em] text-texto-suave uppercase">{rotulo}</p>
      <p className="display mt-1 text-3xl tabular-nums">{valor}</p>
    </>
  );

  if (!href || valor === 0) {
    return <li className="rounded-xl border border-borda bg-superficie px-4 py-3">{dentro}</li>;
  }

  return (
    <li>
      <a
        href={href}
        title={dica}
        className="block h-full rounded-xl border border-borda bg-superficie px-4 py-3 transition hover:border-marca"
      >
        {dentro}
      </a>
    </li>
  );
}

function Secao({
  titulo,
  descricao,
  children,
  id,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="display text-2xl text-marca">{titulo}</h2>
      <p className="mt-1 mb-4 text-sm text-texto-suave">{descricao}</p>
      {children}
    </section>
  );
}

function Retrato({ nome, foto }: { nome: string; foto: string | null }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt="" className="size-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[11px] font-medium text-marca">
      {iniciais(nome)}
    </span>
  );
}

function Carregando() {
  return (
    <div aria-busy className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-superficie-2" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-superficie-2" />
      <p className="text-sm text-texto-suave">Lendo sessões e tarefas de cada mentorada…</p>
    </div>
  );
}
