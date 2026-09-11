import { exigirSessao } from '@/lib/session';
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

  let perfil, sessoes;
  try {
    [perfil, sessoes] = await Promise.all([
      perfilDaTutora(tutoraId),
      sessoesDaTutora(tutoraId, sessao.tutora.email),
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
  const cronologico = [...meses].reverse();

  // Programa e Mentoria são a mesma pergunta feita duas vezes ("de que produto
  // você é tutora?"), e vinham repetindo item. Viram um campo só, sem repetição.
  const tutoraDe = [
    ...new Set(
      [perfil?.programa, perfil?.mentoria]
        .filter(Boolean)
        .flatMap((v) => v!.split(',').map((x) => x.trim()))
        .filter(Boolean),
    ),
  ].join(', ');

  // Campo vazio não vira linha com travessão: some.
  const atuacao = [
    { rotulo: 'Área do método', valor: perfil?.areaDoMetodo ?? '' },
    { rotulo: 'Programas', valor: tutoraDe },
    { rotulo: 'Especialidades', valor: perfil?.especialidades ?? '' },
    { rotulo: 'Principais tópicos', valor: perfil?.topicos ?? '' },
  ].filter((c) => c.valor);
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

      {atuacao.length > 0 ? (
        <Secao titulo="Onde você atua">
          <dl className="grid gap-x-10 gap-y-4 rounded-xl border border-borda bg-superficie p-6 sm:grid-cols-2 xl:grid-cols-3">
            {atuacao.map((c) => (
              <div key={c.rotulo}>
                <dt className="rotulo text-[10px] text-destaque">{c.rotulo}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{c.valor}</dd>
              </div>
            ))}
          </dl>
        </Secao>
      ) : null}

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

      <Secao titulo="Recebido mês a mês">
        {meses.length === 0 ? (
          <Vazio>
            {semUsuario
              ? 'Não encontrei tutorias suas no controle. Confira se o e-mail cadastrado aqui é o mesmo da sua conta no Notion.'
              : 'Nenhuma tutoria realizada ainda.'}
          </Vazio>
        ) : (
          <GraficoMeses meses={cronologico} tipo="reais" />
        )}
      </Secao>

      {meses.length > 0 ? (
        <Secao titulo="Tutorias por mês">
          <GraficoMeses meses={cronologico} tipo="volume" />
        </Secao>
      ) : null}
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
