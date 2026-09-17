import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { tutorasDoHub } from '@/lib/notion/hub';
import { pilaresDaMentorada } from '@/lib/notion/pilares';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { GaleriaTutoras } from '@/components/area-mentorada/GaleriaTutoras';
import { PilaresDeTutoria } from '@/components/area-mentorada/PilaresDeTutoria';

export const dynamic = 'force-dynamic';

/** Página do cartão "Tutorias": a galeria "Tutorias do HUB" e os pilares da mentorada. */
export default async function TutoriasPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const [tutoras, pilares] = await Promise.all([
    tutorasDoHub().catch((e) => e as Error),
    pilaresDaMentorada(mentorada.id).catch((e) => e as Error),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">Tutorias</h1>
      <p className="mt-1 mb-8 text-sm text-texto-suave">{mentorada.nome}</p>

      <Bloco icone={Users} titulo="Tutorias do HUB">
        {tutoras instanceof Error ? (
          <AvisoNotion erro={tutoras} detalhar={sessao.real.is_admin} />
        ) : (
          <GaleriaTutoras tutoras={tutoras} />
        )}
      </Bloco>

      <div className="mt-4">
        {pilares instanceof Error ? (
          <AvisoNotion erro={pilares} detalhar={sessao.real.is_admin} />
        ) : pilares && pilares.length ? (
          <PilaresDeTutoria pilares={pilares} />
        ) : null}
      </div>
    </div>
  );
}
