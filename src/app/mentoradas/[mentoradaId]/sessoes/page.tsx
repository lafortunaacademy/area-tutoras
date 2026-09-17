import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { anoDaSessao, sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { cicloAtual } from '@/lib/notion/config';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { ListaDeSessoes } from '@/components/area-mentorada/ListaDeSessoes';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';

export const dynamic = 'force-dynamic';

/** Página do cartão "Sessões": as sessões da mentorada, só para ver. */
export default async function SessoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const { ano: anoPedido } = await searchParams;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const dados = await sessoesPorCiclo(mentorada).catch((e) => e as Error);

  // Ciclo mostrado: o pedido no endereço; senão o atual; senão o mais recente em que ela teve sessões.
  const anoAtual = cicloAtual().match(/\d{4}/)![0];
  const anos = dados instanceof Error ? [] : dados.anos;
  const ano = anoPedido && anos.includes(anoPedido) ? anoPedido : anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual);
  const sessoes = dados instanceof Error ? dados : dados.sessoes.filter((s) => anoDaSessao(s) === ano);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">Sessões</h1>
      <p className="mt-1 mb-6 text-sm text-texto-suave">{mentorada.nome}</p>

      <div className="mb-4">
        <SeletorDeAno
          anos={anos}
          selecionado={ano}
          caminho={`/mentoradas/${mentorada.id}/sessoes`}
          rotulo={(a) => `Ciclo ${a}`}
          mesmoComUm
        />
      </div>

      <Bloco
        icone={Video}
        titulo="Sessões da mentoria"
        acao={<span className="text-xs whitespace-nowrap text-texto-suave">Ciclo {ano}</span>}
      >
        {sessoes instanceof Error ? (
          <AvisoNotion erro={sessoes} detalhar={sessao.real.is_admin} />
        ) : (
          <ListaDeSessoes key={ano} mentoradaId={mentorada.id} sessoes={sessoes} />
        )}
      </Bloco>
    </div>
  );
}
