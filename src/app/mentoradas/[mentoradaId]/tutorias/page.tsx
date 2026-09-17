import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { tutorasDoHub } from '@/lib/notion/hub';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { GaleriaTutoras } from '@/components/area-mentorada/GaleriaTutoras';

export const dynamic = 'force-dynamic';

/** Página do cartão "Tutorias": por enquanto, a galeria "Tutorias do HUB". */
export default async function TutoriasPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
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

      <h1 className="display text-3xl sm:text-4xl">Tutorias</h1>
      <p className="mt-1 mb-8 text-sm text-texto-suave">{mentorada.nome}</p>

      <Bloco icone={Users} titulo="Tutorias do HUB">
        {tutoras instanceof Error ? (
          <AvisoNotion erro={tutoras} detalhar={sessao.real.is_admin} />
        ) : (
          <GaleriaTutoras tutoras={tutoras} />
        )}
      </Bloco>
    </div>
  );
}
