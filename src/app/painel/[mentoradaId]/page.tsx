import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/guard';
import { briefings, handsoffs, mapaDaCliente, planejamento } from '@/lib/notion/mentorada';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';
import { ObjetivosPorAno } from '@/components/TabelaObjetivos';
import { MapaDaCliente } from '@/components/MapaDaCliente';
import { TabelaNotion } from '@/components/TabelaNotion';
import { pilaresDaMentorada } from '@/lib/notion/pilares';
import { PilaresDeTutoria } from '@/components/area-mentorada/PilaresDeTutoria';
import { sessoesDosPilares, sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { ordenarCiclos } from '@/lib/notion/config';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';
import { daArea, trechosDaTutora } from '@/lib/tutorias/acesso';

export const dynamic = 'force-dynamic';

export default async function MentoradaPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const sessao = await exigirSessao();
  const { mentoradaId } = await params;
  const { ano: anoPedido } = await searchParams;
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  // 404 se a mentorada não estiver na carteira desta tutora.
  const mentorada = await exigirMentorada(mentoradaId);

  // Só as listagens são carregadas aqui — o conteúdo de cada item fica para
  // quando a tutora expandir aquele item.
  const [mapa, plano, brief, hands, tutorias] = await Promise.all([
    mapaDaCliente(mentorada).catch(() => []),
    planejamento(mentorada).catch((e) => e as Error),
    briefings(mentorada, tutoraId).catch(() => []),
    handsoffs(mentorada, tutoraId).catch(() => []),
    // Só as tutorias da área desta tutora (o administrativo vê todas).
    Promise.all([pilaresDaMentorada(mentorada), trechosDaTutora()])
      .then(([pilares, trechos]) =>
        pilares
          ?.map((p) => ({ ...p, tutorias: p.tutorias.filter((t) => daArea(t.titulo, trechos)) }))
          .filter((p) => p.tutorias.length) ?? null,
      )
      .catch(() => null),
  ]);
  // Ciclo mostrado nas tabelas de sessões de cada pilar.
  const dasSessoes = await sessoesPorCiclo(mentorada).catch(() => null);
  // Só os ciclos marcados no Notion nas sessões dela viram botão.
  const todos = ordenarCiclos(dasSessoes?.ciclos ?? []);
  const ciclo = anoPedido && todos.includes(anoPedido) ? anoPedido : (todos[0] ?? '');

  const sessoesPorPilar = tutorias
    ? await sessoesDosPilares(
        mentorada,
        tutorias.map((p) => ({ id: p.id, tutorias: p.tutorias.map((t) => ({ nome: t.titulo })) })),
        ciclo,
      ).catch(() => null)
    : null;

  return (
    <div>
      {/* Em telas com o menu lateral, voltar já é clicar em outro nome. */}
      <Link
        href="/painel/mentoradas"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca lg:hidden"
      >
        <ArrowLeft aria-hidden size={14} />
        Mentoradas
      </Link>

      <div className="mb-10 border-b border-borda pb-6">
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight">{mentorada.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {mentorada.mentoria ? <Etiqueta texto={mentorada.mentoria} /> : null}
          </div>
        </div>
      </div>

      <Secao titulo="Mapa da cliente" ancora="mapa">
        {mapa.length === 0 ? (
          <Vazio>Nenhum mapa preenchido ainda.</Vazio>
        ) : (
          <div className="space-y-4">
            {mapa.map((item) => (
              <MapaDaCliente key={item.id} item={item} nome={mentorada.nome} foto={mentorada.foto} />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Planejamento estratégico" ancora="planejamento">
        {plano instanceof Error ? (
          <AvisoNotion erro={plano} detalhar={sessao.real.is_admin} />
        ) : plano === null ? (
          <Vazio>
            {mentorada.areaDaClienteIds.length === 0
              ? 'Esta mentorada ainda não tem área individual vinculada, e os objetivos se ligam a ela por ali. É o mesmo motivo da foto e da mentoria não aparecerem.'
              : 'Não consigo separar os objetivos por mentorada — mostrar sem esse recorte traria os objetivos de todas.'}
          </Vazio>
        ) : (
          <ObjetivosPorAno objetivos={plano} />
        )}
      </Secao>

      <Secao titulo="Briefings" ancora="briefings">
        <TabelaNotion
          mentoradaId={mentorada.id}
          vazio="Nenhum briefing para esta mentorada."
          colunas={[
            { nome: 'Data', largura: 'w-28' },
            { nome: 'Briefing' },
            { nome: 'Para a tutora', largura: 'w-52' },
          ]}
          linhas={brief.map((b) => ({
            id: b.id,
            titulo: b.titulo,
            celulas: [b.data, b.titulo, b.tutora],
          }))}
        />
      </Secao>

      <Secao
        titulo="Hands-off"
        ancora="hands-off"
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
        <TabelaNotion
          mentoradaId={mentorada.id}
          vazio="Nenhuma sessão registrada ainda."
          colunas={[
            { nome: 'Hands-off' },
            { nome: 'Feito pela tutora', largura: 'w-52' },
            { nome: 'Data da sessão', largura: 'w-36' },
          ]}
          linhas={hands.map((h) => ({
            id: h.id,
            titulo: h.titulo,
            celulas: [h.titulo, h.tutora, h.dataSessao],
            editarHref:
              h.minha && !sessao.verComo
                ? `/painel/${mentorada.id}/hands-off/${h.id}/editar`
                : undefined,
          }))}
        />
      </Secao>

      {/* Respostas da mentorada às tutorias (pré-sessões, 1:1…). A tutora só lê. */}
      <Secao
        titulo="Tutorias"
        ancora="tutorias"
        acao={
          <SeletorDeAno anos={todos} selecionado={ciclo} caminho={`/painel/${mentorada.id}`} mesmoComUm />
        }
      >
        {tutorias === null ? (
          <Vazio>Não foi possível carregar as tutorias agora.</Vazio>
        ) : tutorias.length === 0 ? (
          <Vazio>Nenhuma tutoria da sua área por aqui.</Vazio>
        ) : (
          <PilaresDeTutoria key={ciclo} pilares={tutorias} mentoradaId={mentorada.id} admin={false} sessoes={sessoesPorPilar} />
        )}
      </Secao>
    </div>
  );
}

function Secao({
  titulo,
  ancora,
  acao,
  children,
}: {
  titulo: string;
  /** id da seção, para o menu lateral levar até ela. */
  ancora?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={ancora} className="mb-10 scroll-mt-24">
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
