import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import {
  desdeAPrimeiraSessao,
  emReais,
  perfilDaTutora,
  porMes,
  sessoesDaTutora,
} from '@/lib/notion/tutora';
import { formatarData } from '@/lib/notion/props';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';

export const dynamic = 'force-dynamic';

export default async function InicioPage() {
  const sessao = await exigirSessao();
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  let perfil, sessoes, mentoradas;
  try {
    [perfil, sessoes, mentoradas] = await Promise.all([
      perfilDaTutora(tutoraId),
      sessoesDaTutora(tutoraId),
      carteiraDaTutora(tutoraId),
    ]);
  } catch (erro) {
    return <AvisoNotion erro={erro} />;
  }

  const meses = porMes(sessoes);
  const inicio = desdeAPrimeiraSessao(sessoes);
  const comValor = sessoes.some((s) => s.valor !== null);
  const total = comValor ? sessoes.reduce((soma, s) => soma + (s.valor ?? 0), 0) : null;

  const agora = new Date().toISOString().slice(0, 7);
  const esteMes = meses.find((m) => m.chave === agora);

  const atendidas = new Set(sessoes.flatMap((s) => s.mentoradaIds));

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

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Numero rotulo="Sessões registradas" valor={String(sessoes.length)} />
        <Numero rotulo="Neste mês" valor={String(esteMes?.sessoes ?? 0)} />
        <Numero rotulo="Mentoradas atendidas" valor={String(atendidas.size)} />
        {total !== null ? <Numero rotulo="Total recebido" valor={emReais(total)} /> : null}
        <Numero
          rotulo="Atuando há"
          valor={inicio ? `${inicio.meses} ${inicio.meses === 1 ? 'mês' : 'meses'}` : '—'}
          nota={inicio ? `desde a 1ª sessão, ${formatarData(inicio.desde)}` : undefined}
        />
      </div>

      <Secao titulo="Mês a mês">
        {meses.length === 0 ? (
          <Vazio>Nenhuma sessão registrada ainda.</Vazio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="border-b border-borda text-left">
                  {['Mês', 'Sessões', ...(comValor ? ['Recebido'] : [])].map((c) => (
                    <th
                      key={c}
                      className="rotulo px-5 py-3 text-[10px] font-normal text-texto-suave"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr
                    key={m.chave}
                    className="border-b border-borda transition last:border-0 hover:bg-fundo"
                  >
                    <td className="px-5 py-3">{m.rotulo}</td>
                    <td className="px-5 py-3 text-texto-suave">{m.sessoes}</td>
                    {comValor ? (
                      <td className="px-5 py-3 tabular-nums">
                        {m.valor === null ? '—' : emReais(m.valor)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-texto-suave">
          Valor por sessão: <strong className="font-medium text-texto">My Partner R$ 450</strong>,{' '}
          <strong className="font-medium text-texto">Pronta Para Fazer Dinheiro R$ 350</strong>.
          Sessão com mentoria fora dessas duas aparece sem valor.
        </p>
      </Secao>

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
