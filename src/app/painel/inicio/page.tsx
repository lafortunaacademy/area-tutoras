import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import {
  desdeAPrimeiraSessao,
  emReais,
  perfilDaTutora,
  porMes,
  sessoesDaTutora,
} from '@/lib/notion/tutora';
import { temUsuarioNoNotion } from '@/lib/notion/tutorias';
import { formatarData } from '@/lib/notion/props';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';
import { GraficoMeses } from '@/components/GraficoMeses';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const sessao = await exigirSessao();
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  let perfil, sessoes, mentoradas;
  try {
    [perfil, sessoes, mentoradas] = await Promise.all([
      perfilDaTutora(tutoraId),
      sessoesDaTutora(tutoraId, sessao.tutora.email),
      carteiraDaTutora(tutoraId),
    ]);
  } catch (erro) {
    return <AvisoNotion erro={erro} detalhar={sessao.real.is_admin} />;
  }

  const meses = porMes(sessoes);
  const inicio = desdeAPrimeiraSessao(sessoes);
  const comValor = sessoes.some((s) => s.valor !== null);
  const total = comValor ? sessoes.reduce((soma, s) => soma + (s.valor ?? 0), 0) : null;

  const agora = new Date().toISOString().slice(0, 7);
  const esteMes = meses.find((m) => m.chave === agora);

  const atendidas = new Set(sessoes.flatMap((s) => s.mentoradaIds));
  const semUsuario = sessoes.length === 0 && (await temUsuarioNoNotion(sessao.tutora.email)) === false;

  return (
    <div>
      <div className="mb-10 flex items-center gap-4 border-b border-borda pb-6">
        {perfil?.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.foto}
            alt=""
            className="size-14 shrink-0 rounded-full border border-borda object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight">
            {perfil?.nome || sessao.tutora.nome}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {perfil?.status ? <Etiqueta texto={perfil.status} /> : null}
            {perfil?.areaDoMetodo ? <Etiqueta texto={perfil.areaDoMetodo} /> : null}
          </div>
        </div>
      </div>

      <Secao titulo="Onde você atua">
        <dl className="grid gap-x-10 gap-y-4 rounded-xl border border-borda bg-superficie p-6 sm:grid-cols-2 xl:grid-cols-3">
          <Campo rotulo="Área do método" valor={perfil?.areaDoMetodo} />
          <Campo rotulo="Especialidades" valor={perfil?.especialidades} />
          <Campo rotulo="Programa" valor={perfil?.programa} />
          <Campo rotulo="Mentoria" valor={perfil?.mentoria} />
          <Campo rotulo="Principais tópicos" valor={perfil?.topicos} />
          <Campo rotulo="Mentoradas na lista" valor={String(mentoradas.length)} />
        </dl>
      </Secao>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Numero rotulo="Tutorias realizadas" valor={String(sessoes.length)} />
        <Numero rotulo="Neste mês" valor={String(esteMes?.sessoes ?? 0)} />
        <Numero rotulo="Mentoradas atendidas" valor={String(atendidas.size)} />
        {total !== null ? <Numero rotulo="Total recebido" valor={emReais(total)} /> : null}
        <Numero
          rotulo="Atuando há"
          valor={inicio ? `${inicio.meses} ${inicio.meses === 1 ? 'mês' : 'meses'}` : '—'}
          nota={inicio ? `desde a 1ª sessão, ${formatarData(inicio.desde)}` : undefined}
        />
      </div>

      <Secao titulo="Tutorias mês a mês">
        {meses.length === 0 ? (
          <Vazio>
            {semUsuario
              ? 'Não encontrei tutorias suas no controle. Confira se o e-mail cadastrado aqui é o mesmo da sua conta no Notion.'
              : 'Nenhuma tutoria realizada ainda.'}
          </Vazio>
        ) : (
          <GraficoMeses meses={[...meses].reverse()} emReais={emReais} />
        )}

        <p className="mt-3 text-xs text-texto-suave">
          Valor por sessão: <strong className="font-medium text-texto">My Partner R$ 450</strong>,{' '}
          <strong className="font-medium text-texto">Pronta Para Fazer Dinheiro R$ 350</strong>.
          Sessão com mentoria fora dessas duas aparece sem valor.
        </p>
      </Secao>

    </div>
  );
}

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie p-5">
      <p className="rotulo text-[10px] text-destaque">{rotulo}</p>
      <p className="display mt-2 text-3xl leading-none">{valor}</p>
      {nota ? <p className="mt-2 text-xs text-texto-suave">{nota}</p> : null}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div>
      <dt className="rotulo text-[10px] text-destaque">{rotulo}</dt>
      <dd className="mt-1 text-sm leading-relaxed">{valor || '—'}</dd>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="rotulo mb-3 text-[11px] text-texto-suave">{titulo}</h2>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
      {children}
    </p>
  );
}
