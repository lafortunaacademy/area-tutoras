import { Suspense } from 'react';
import Link from 'next/link';
import { exigirAdmin } from '@/lib/session';
import { DIAS_ATENCAO, DIAS_CRITICO, TAREFAS_CRITICO, visaoGeral, type Nivel, type ResumoDaMentorada } from '@/lib/notion/visaoGeral';
import { AvisoNotion } from '@/components/AvisoNotion';
import { iniciais } from '@/lib/iniciais';

export const dynamic = 'force-dynamic';

export default async function MentoradasPage() {
  const sessao = await exigirAdmin();

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] tracking-[0.14em] text-texto-suave uppercase">Área das mentoradas</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">Visão geral</h1>
      <p className="mt-1 text-sm text-texto-suave">
        Quem precisa do time agora e em que ponto cada mentorada está no ciclo. Só as mentoradas do modelo novo.
      </p>

      <Suspense fallback={<Carregando />}>
        <Conteudo detalharErro={sessao.real.is_admin} />
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

  const { ciclo, mentoradas } = dados;
  if (mentoradas.length === 0) {
    return <p className="mt-8 text-sm text-texto-suave">Nenhuma mentorada está na área de membros nova ainda.</p>;
  }

  const esperando = mentoradas.filter((m) => m.nivel !== 'em-dia');
  const soma = (f: (m: ResumoDaMentorada) => number) => mentoradas.reduce((t, m) => t + f(m), 0);
  const comAtraso = mentoradas.filter((m) => m.tarefasAtrasadas > 0).length;

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero rotulo="Mentoradas" valor={mentoradas.length} detalhe="no modelo novo" />
        <Numero rotulo="Sessões realizadas" valor={soma((m) => m.realizadas)} detalhe={`no ${ciclo}`} />
        <Numero rotulo="Sessões a realizar" valor={soma((m) => m.aRealizar)} detalhe={`no ${ciclo}`} />
        <Numero
          rotulo="Tarefas atrasadas"
          valor={soma((m) => m.tarefasAtrasadas)}
          detalhe={comAtraso ? `em ${comAtraso} ${comAtraso === 1 ? 'mentorada' : 'mentoradas'}` : 'nenhuma mentorada'}
        />
      </ul>

      <Secao titulo="Esperando alguém do time" descricao="Quem tem algo parado agora. Críticas primeiro.">
        {esperando.length === 0 ? (
          <p className="rounded-xl border border-borda bg-superficie px-4 py-6 text-center text-sm text-texto-suave">
            Ninguém esperando o time agora. Tudo em dia.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {esperando.map((m) => (
              <li key={m.mentorada.id}>
                <Link
                  href={`/mentoradas/${m.mentorada.id}`}
                  className={`block h-full rounded-xl border border-borda border-l-4 bg-superficie p-4 transition hover:shadow-[var(--sombra)] ${
                    m.nivel === 'critico' ? 'border-l-parado' : 'border-l-andamento'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{m.mentorada.nome}</p>
                    <SeloNivel nivel={m.nivel} />
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-texto-suave">
                    {m.motivos.map((motivo) => (
                      <li key={motivo} className="flex gap-1.5">
                        <span aria-hidden>·</span>
                        {motivo}
                      </li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        titulo="Alertas de acompanhamento"
        descricao={`Crítico: ${TAREFAS_CRITICO} ou mais tarefas atrasadas, ou ${DIAS_CRITICO} dias sem sessão. Atenção: tarefa atrasada, ${DIAS_ATENCAO} dias sem sessão, sessão prevista vencida ou tutoria sem tutora.`}
      >
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-borda text-left">
                {['Mentorada', 'Nível', 'Por quê', 'Última sessão'].map((c) => (
                  <th key={c} className="px-4 py-2.5 text-[11px] font-medium tracking-wide whitespace-nowrap text-texto-suave uppercase">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mentoradas.map((m) => (
                <tr key={m.mentorada.id} className="border-b border-borda/60 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/mentoradas/${m.mentorada.id}`} className="flex items-center gap-2.5 hover:text-marca">
                      <Retrato nome={m.mentorada.nome} foto={m.mentorada.foto} />
                      <span className="min-w-0">
                        <span className="block font-medium">{m.mentorada.nome}</span>
                        {m.mentorada.mentoria ? <span className="block text-xs text-texto-suave">{m.mentorada.mentoria}</span> : null}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <SeloNivel nivel={m.nivel} />
                  </td>
                  <td className="px-4 py-2.5 text-texto-suave">
                    {m.motivos.length ? m.motivos.join(' · ') : 'Tudo em dia'}
                    {m.incompleto ? <span className="block text-xs">Parte dos dados não carregou agora.</span> : null}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">
                    {m.ultimaSessao ? `${m.ultimaSessao.split('-').reverse().join('/')} · há ${m.diasSemSessao} dias` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao titulo="Onde cada mentorada está" descricao={`Sessões realizadas no ${ciclo}, de todas as previstas.`}>
        <ul className="space-y-3 rounded-xl border border-borda bg-superficie p-4 sm:p-5">
          {[...mentoradas]
            .sort((a, b) => fracao(b) - fracao(a) || a.mentorada.nome.localeCompare(b.mentorada.nome, 'pt-BR'))
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

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe: string }) {
  return (
    <li className="rounded-xl border border-borda bg-superficie px-4 py-3">
      <p className="text-[10.5px] tracking-[0.12em] text-texto-suave uppercase">{rotulo}</p>
      <p className="display mt-1 text-3xl tabular-nums">{valor}</p>
      <p className="text-xs text-texto-suave">{detalhe}</p>
    </li>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="display text-2xl text-marca">{titulo}</h2>
      <p className="mt-1 mb-4 text-sm text-texto-suave">{descricao}</p>
      {children}
    </section>
  );
}

const NIVEIS: Record<Nivel, { rotulo: string; classe: string }> = {
  critico: { rotulo: 'Crítico', classe: 'bg-parado-suave text-parado' },
  atencao: { rotulo: 'Atenção', classe: 'bg-andamento-suave text-andamento' },
  'em-dia': { rotulo: 'Em dia', classe: 'bg-ok-suave text-ok' },
};

function SeloNivel({ nivel }: { nivel: Nivel }) {
  const n = NIVEIS[nivel];
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium tracking-wide uppercase ${n.classe}`}>
      {n.rotulo}
    </span>
  );
}

function Retrato({ nome, foto }: { nome: string; foto: string | null }) {
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt="" className="size-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[10px] font-medium text-marca">
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
