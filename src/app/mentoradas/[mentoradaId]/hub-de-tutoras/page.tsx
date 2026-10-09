import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { tutorasDoHub } from '@/lib/notion/hub';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { GaleriaTutoras } from '@/components/area-mentorada/GaleriaTutoras';

export const dynamic = 'force-dynamic';

/** O HUB de tutoras, que antes morava dentro da página Tutorias. */
export default async function HubDeTutorasPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  const { mentoradaId } = await params;
  const visitante = await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const tutoras = await tutorasDoHub().catch((e) => e as Error);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">HUB de tutoras</h1>
      <p className="mt-1 mb-6 text-sm text-texto-suave">Quem acompanha você na mentoria.</p>

      <Bloco icone={Users} titulo="Tutorias do HUB">
        {tutoras instanceof Error ? (
          <AvisoNotion erro={tutoras} detalhar={visitante.admin} />
        ) : (
          <GaleriaTutoras tutoras={tutoras} />
        )}
      </Bloco>
    </div>
  );
}
