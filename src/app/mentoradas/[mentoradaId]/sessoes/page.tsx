import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { sessoesDaMentorada } from '@/lib/notion/sessoesDaMentorada';
import { cicloAtual } from '@/lib/notion/config';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { ListaDeSessoes } from '@/components/area-mentorada/ListaDeSessoes';

export const dynamic = 'force-dynamic';

/** Página do cartão "Sessões": as sessões da mentorada, só para ver. */
export default async function SessoesPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const sessoes = await sessoesDaMentorada(mentorada).catch((e) => e as Error);

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
      <p className="mt-1 mb-8 text-sm text-texto-suave">{mentorada.nome}</p>

      <Bloco
        icone={Video}
        titulo="Sessões da mentoria"
        acao={<span className="text-xs whitespace-nowrap text-texto-suave">{cicloAtual()}</span>}
      >
        {sessoes instanceof Error ? (
          <AvisoNotion erro={sessoes} detalhar={sessao.real.is_admin} />
        ) : (
          <ListaDeSessoes mentoradaId={mentorada.id} sessoes={sessoes} />
        )}
      </Bloco>
    </div>
  );
}
