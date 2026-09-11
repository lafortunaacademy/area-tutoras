import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/guard';
import {
  briefings,
  fotoDaMentorada,
  handsoffs,
  mapaDaCliente,
  planejamento,
} from '@/lib/notion/mentorada';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';
import { MapaDaCliente } from '@/components/MapaDaCliente';
import { ItemExpansivel } from '@/components/ItemExpansivel';

export const dynamic = 'force-dynamic';

export default async function MentoradaPage({
  params,
}: {
  params: Promise<{ mentoradaId: string }>;
}) {
  const sessao = await exigirSessao();
  const { mentoradaId } = await params;
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  // 404 se a mentorada não estiver na carteira desta tutora.
  const mentorada = await exigirMentorada(tutoraId, mentoradaId);

  // Só as listagens são carregadas aqui — o conteúdo de cada item fica para
  // quando a tutora expandir aquele item.
  const [mapa, foto, plano, brief, hands] = await Promise.all([
    mapaDaCliente(mentorada).catch(() => []),
    fotoDaMentorada(mentorada).catch(() => null),
    planejamento(mentorada).catch((e) => e as Error),
    briefings(mentorada, tutoraId).catch(() => []),
    handsoffs(mentorada, tutoraId).catch(() => []),
  ]);

  return (
    <div>
      <Link
        href="/painel"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        Mentoradas
      </Link>

      <div className="mb-10">
        <h1 className="display text-2xl">{mentorada.nome}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mentorada.mentoria ? <Etiqueta texto={mentorada.mentoria} /> : null}
          {mentorada.status ? <Etiqueta texto={mentorada.status} /> : null}
        </div>
      </div>

      <Secao titulo="Mapa da cliente">
        {mapa.length === 0 ? (
          <Vazio>Nenhum mapa preenchido no Notion ainda.</Vazio>
        ) : (
          <div className="space-y-4">
            {mapa.map((item) => (
              <MapaDaCliente key={item.id} item={item} nome={mentorada.nome} foto={foto} />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Planejamento estratégico">
        {plano instanceof Error ? (
          <AvisoNotion erro={plano} />
        ) : plano === null ? (
          <Vazio>
            Ainda não consigo separar os objetivos por mentorada: a base de
            planejamento se liga a ela por uma relation que aponta para uma base
            que não foi compartilhada com a integração. Mostrar sem esse recorte
            traria os objetivos de todas as mentoradas.
          </Vazio>
        ) : plano.length === 0 ? (
          <Vazio>Nenhum objetivo cadastrado.</Vazio>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs uppercase tracking-wide text-texto-suave">
                  <th className="px-4 py-3 font-medium">Objetivo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Trimestre</th>
                  <th className="px-4 py-3 font-medium">Pilar</th>
                  <th className="px-4 py-3 font-medium">Tutoria</th>
                </tr>
              </thead>
              <tbody>
                {plano.map((item) => (
                  <tr key={item.id} className="border-b border-borda last:border-0">
                    <td className="px-4 py-3">{item.objetivo}</td>
                    <td className="px-4 py-3">
                      <Etiqueta texto={item.status} />
                    </td>
                    <td className="px-4 py-3 text-texto-suave">{item.trimestre}</td>
                    <td className="px-4 py-3 text-texto-suave">{item.pilar}</td>
                    <td className="px-4 py-3 text-texto-suave">{item.tutoria}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Briefings">
        {brief.length === 0 ? (
          <Vazio>Nenhum briefing para você nesta mentorada.</Vazio>
        ) : (
          <ul className="space-y-2">
            {brief.map((item) => (
              <ItemExpansivel
                key={item.id}
                pageId={item.id}
                mentoradaId={mentorada.id}
                titulo={item.titulo}
                meta={<span className="shrink-0 text-xs text-texto-suave">{item.data}</span>}
              />
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        titulo="Hands-off"
        acao={
          sessao.verComo ? (
            <span className="text-xs text-texto-suave">preview — só leitura</span>
          ) : (
            <Link
              href={`/painel/${mentorada.id}/hands-off/novo`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-marca-contraste transition hover:opacity-90"
            >
              <Plus aria-hidden size={14} />
              Novo hands-off
            </Link>
          )
        }
      >
        {hands.length === 0 ? (
          <Vazio>Nenhuma sessão registrada ainda.</Vazio>
        ) : (
          <ul className="space-y-2">
            {hands.map((item) => (
              <ItemExpansivel
                key={item.id}
                pageId={item.id}
                mentoradaId={mentorada.id}
                titulo={item.titulo}
                meta={
                  <span className="shrink-0 text-xs text-texto-suave">{item.dataSessao}</span>
                }
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-xs text-marca underline underline-offset-2"
                >
                  Abrir no Notion
                </a>
              </ItemExpansivel>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="rotulo text-[11px] text-texto-suave">{titulo}</h2>
        {acao}
      </div>
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
