import { exigirSessao } from '@/lib/session';
import {
  comoRecebimento,
  mesSeguinte,
  emReais,
  perfilDaTutora,
  mentoriasDe,
  porMes,
  sessoesDaTutora,
} from '@/lib/notion/tutora';
import { temUsuarioNoNotion } from '@/lib/notion/tutorias';
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
      sessoesDaTutora(tutoraId),
    ]);
  } catch (erro) {
    return <AvisoNotion erro={erro} detalhar={sessao.real.is_admin} />;
  }

  const meses = porMes(sessoes);
  const mentorias = mentoriasDe(sessoes);
  const comValor = sessoes.some((s) => s.valor !== null);
  const total = comValor ? sessoes.reduce((soma, s) => soma + (s.valor ?? 0), 0) : null;

  const agora = new Date().toISOString().slice(0, 7);
  const esteMes = meses.find((m) => m.chave === agora);

  const cronologico = [...meses].reverse();
  // O pagamento cai no mês seguinte ao da sessão.
  const recebimentos = comoRecebimento(cronologico);
  const aReceber = esteMes?.valorEmReais ?? null;
  const mesQueVem = rotuloCurtoDoMes(mesSeguinte(agora));

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
    { rotulo: 'Especialidades', valor: perfil?.especialidades ?? '' },
    { rotulo: 'Programas', valor: tutoraDe },
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
                <dt className="rotulo text-[11px] text-destaque">{c.rotulo}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{c.valor}</dd>
              </div>
            ))}
          </dl>
        </Secao>
      ) : null}

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Numero rotulo="Tutorias realizadas" valor={String(sessoes.length)} />
        <Numero rotulo="Neste mês" valor={String(esteMes?.sessoes ?? 0)} />
        {total !== null ? <Numero rotulo="Total recebido" valor={emReais(total)} /> : null}
        {aReceber ? <Numero rotulo={`A receber em ${mesQueVem}`} valor={aReceber} nota="das sessões deste mês" /> : null}
      </div>

      <Secao titulo="Recebido mês a mês" nota="O valor de cada mês cai no mês seguinte; o gráfico já mostra no mês do recebimento.">
        {meses.length === 0 ? (
          <Vazio>
            {semUsuario
              ? 'Não encontrei tutorias suas no controle. Confira se o e-mail cadastrado aqui é o mesmo da sua conta no Notion.'
              : 'Nenhuma tutoria realizada ainda.'}
          </Vazio>
        ) : (
          <GraficoMeses meses={recebimentos} tipo="reais" mentorias={mentorias} />
        )}
      </Secao>

      {meses.length > 0 ? (
        <Secao titulo="Tutorias por mês">
          <GraficoMeses meses={cronologico} tipo="volume" mentorias={mentorias} />
        </Secao>
      ) : null}
    </div>
  );
}

function Numero({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie p-5">
      <p className="rotulo text-[11px] text-destaque">{rotulo}</p>
      <p className="display mt-2 text-3xl leading-none">{valor}</p>
      {nota ? <p className="mt-2 text-xs text-texto-suave">{nota}</p> : null}
    </div>
  );
}

function Secao({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="rotulo mb-1 text-[12px] text-texto-suave">{titulo}</h2>
      {nota ? <p className="mb-3 text-xs text-texto-suave">{nota}</p> : null}
      {!nota ? <div className="mb-3" /> : null}
      {children}
    </section>
  );
}

/** "2026-10" -> "out/26", para caber no rótulo de um número. */
function rotuloCurtoDoMes(chave: string): string {
  const [ano, mes] = chave.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${nomes[Number(mes) - 1] ?? mes}/${ano.slice(2)}`;
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
      {children}
    </p>
  );
}
