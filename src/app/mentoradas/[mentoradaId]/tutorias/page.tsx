import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { tutorasDoHub } from '@/lib/notion/hub';
import { pilaresDaMentorada } from '@/lib/notion/pilares';
import { sessoesDosPilares } from '@/lib/notion/sessoesDaMentorada';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { GaleriaTutoras } from '@/components/area-mentorada/GaleriaTutoras';
import { PilaresDeTutoria } from '@/components/area-mentorada/PilaresDeTutoria';

export const dynamic = 'force-dynamic';

/**
 * Página do cartão "Tutorias": a galeria "Tutorias do HUB" e os pilares, lidos
 * da página Tutorias desta mentorada no Notion. O que ela responde é gravado lá.
 */
export default async function TutoriasPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  const { mentoradaId } = await params;
  const visitante = await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const [tutoras, pilares] = await Promise.all([
    tutorasDoHub().catch((e) => e as Error),
    pilaresDaMentorada(mentorada).catch(() => null),
  ]);
  // As sessões de cada pilar vêm do controle, não da página de tutorias.
  const sessoes = pilares
    ? await sessoesDosPilares(
        mentorada,
        pilares.map((p) => ({ id: p.id, tutorias: p.tutorias.map((t) => ({ nome: t.titulo })) })),
      ).catch(() => null)
    : null;

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
          <AvisoNotion erro={tutoras} detalhar={visitante.admin} />
        ) : (
          <GaleriaTutoras tutoras={tutoras} />
        )}
      </Bloco>

      <div className="mt-4">
        {pilares === null ? (
          <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
            Não foi possível carregar as tutorias agora.
          </p>
        ) : pilares.length ? (
          <PilaresDeTutoria pilares={pilares} mentoradaId={mentorada.id} admin={visitante.admin} sessoes={sessoes} />
        ) : null}
      </div>
    </div>
  );
}
