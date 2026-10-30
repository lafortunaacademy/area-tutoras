import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { exigirSessao } from '@/lib/session';
import { mesSeguinte, emReais, perfilDaTutora, mentoriasDe, porMes, sessoesDaTutora } from '@/lib/notion/tutora';
import { proximasDaTutora, temUsuarioNoNotion } from '@/lib/notion/tutorias';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { GraficoMeses } from '@/components/GraficoMeses';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const sessao = await exigirSessao();
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  let perfil, sessoes, proximas, mentoradas;
  try {
    [perfil, sessoes, proximas, mentoradas] = await Promise.all([
      perfilDaTutora(tutoraId),
      sessoesDaTutora(tutoraId),
      proximasDaTutora(tutoraId),
      // A carteira inteira, não só o modelo novo: é dela que sai o nome da
      // mentorada de cada sessão.
      carteiraDaTutora().catch(() => []),
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

  // Onde ela atua, junto do nome: as especialidades como etiqueta e, ao lado,
  // os produtos de que ela é tutora, que são marcas e aparecem como marcas.
  const emLista = (valor: string) =>
    valor
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  const especialidades = emLista(perfil?.especialidades ?? '');
  const programas = emLista(tutoraDe);
  const semUsuario = sessoes.length === 0 && (await temUsuarioNoNotion(sessao.tutora.email)) === false;

  // O nome da mentorada de cada sessão: a sessão guarda só o ID da página dela.
  const nomes = new Map(mentoradas.map((m) => [normalizarId(m.id), m]));
  // Sessão sem mentorada não é tutoria de ninguém (as da própria Fernanda, por
  // exemplo): fica de fora da agenda da tutora.
  const agenda = proximas
    .filter((t) => t.mentoradaIds.length > 0)
    .slice(0, 6)
    .map((t) => {
      const dela = t.mentoradaIds.map((id) => nomes.get(normalizarId(id))).find(Boolean);
      return { ...t, mentorada: dela?.nome ?? '', mentoradaId: dela?.id ?? null };
    });

  return (
    <div>
      <div className="mb-10 flex items-center gap-5 border-b border-borda pb-7">
        {perfil?.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfil.foto}
            alt=""
            className="size-20 shrink-0 rounded-full border border-borda object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="display text-4xl leading-tight italic">{perfil?.nome || sessao.tutora.nome}</h1>
          {/* O que ela faz, não como o cadastro dela está: a área do método e
              as especialidades. O status fica para o administrativo. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {especialidades.map((e) => (
              <Etiqueta key={e} texto={e} />
            ))}
          </div>

          {programas.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {programas.map((p) => (
                <Programa key={p} nome={p} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Secao titulo="Suas próximas tutorias">
        {agenda.length === 0 ? (
          <Vazio>Nada agendado por enquanto.</Vazio>
        ) : (
          <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
            {agenda.map((t) => (
              <li key={t.id}>
                <Agendada tutoria={t} />
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Numero rotulo="Tutorias realizadas" valor={String(sessoes.length)} />
        <Numero rotulo="Neste mês" valor={String(esteMes?.sessoes ?? 0)} />
        {total !== null ? <Numero rotulo="Total recebido" valor={emReais(total)} /> : null}
        {aReceber ? <Numero rotulo={`A receber em ${mesQueVem}`} valor={aReceber} nota="das sessões deste mês" /> : null}
      </div>

      <Secao titulo="Tutorias por mês">
        {meses.length === 0 ? (
          <Vazio>
            {semUsuario
              ? 'Não encontrei tutorias suas no controle. Confira se o e-mail cadastrado aqui é o mesmo da sua conta no Notion.'
              : 'Nenhuma tutoria realizada ainda.'}
          </Vazio>
        ) : (
          <GraficoMeses meses={cronologico} tipo="volume" mentorias={mentorias} />
        )}
      </Secao>
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

/** Uma sessão que ainda vai acontecer: quando, com quem e o que é. */
function Agendada({
  tutoria,
}: {
  tutoria: { sessao: string; status: string; corStatus: string; data: string | null; mentorada: string; mentoradaId: string | null };
}) {
  const miolo = (
    <>
      <span className="w-24 shrink-0 text-sm tabular-nums">
        {tutoria.data ? tutoria.data.slice(0, 10).split('-').reverse().join('/') : 'sem data'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{tutoria.mentorada || tutoria.sessao}</span>
        {tutoria.mentorada ? <span className="block text-xs text-texto-suave">{tutoria.sessao}</span> : null}
      </span>
      <EtiquetaNotion texto={tutoria.status} cor={tutoria.corStatus} />
    </>
  );

  if (!tutoria.mentoradaId) {
    return <span className="flex items-center gap-3 px-5 py-3">{miolo}</span>;
  }

  return (
    <Link href={`/painel/${tutoria.mentoradaId}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-fundo">
      {miolo}
      <ChevronRight aria-hidden size={14} className="shrink-0 text-texto-suave" />
    </Link>
  );
}

/**
 * Um produto de que ela é tutora: My Partner, Pronta Para Fazer Dinheiro.
 *
 * Cada um tem o próprio símbolo, que é como a tutora reconhece o produto. Os
 * arquivos são os oficiais da marca, no café; no tema escuro eles invertem,
 * como o logotipo da La Fortuna.
 */
const SIMBOLOS: { contem: RegExp; arquivo: string }[] = [
  { contem: /my\s*partner/i, arquivo: '/marca/produtos/my-partner.png' },
  { contem: /pronta.*dinheiro/i, arquivo: '/marca/produtos/ppfd.png' },
];

function Programa({ nome }: { nome: string }) {
  const simbolo = SIMBOLOS.find((s) => s.contem.test(nome))?.arquivo;

  return (
    <span className="flex items-center gap-2 text-sm">
      {simbolo ? (
        // eslint-disable-next-line @next/next/no-img-element -- símbolo pequeno, sem ganho em otimizar
        <img src={simbolo} alt="" className="logo-marca h-6 w-auto shrink-0" />
      ) : null}
      {nome}
    </span>
  );
}
