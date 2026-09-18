import Image from 'next/image';
import { lerLinkDePreenchimento } from '@/lib/linkDePreenchimento';
import { ehPreSessao, materialDaMentorada } from '@/lib/notion/pilares';
import { FormularioPreSessao } from '@/components/area-mentorada/FormularioPreSessao';

export const dynamic = 'force-dynamic';

/**
 * Página de um link de preenchimento: só a pré-sessão daquele link, sem login.
 * O token diz de quem é e qual é — nada além disso abre por aqui.
 */
export default async function PreenchimentoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = lerLinkDePreenchimento(token);
  const material = link ? await materialDaMentorada(link.mentoradaId, link.materialId).catch(() => null) : null;

  if (!link || !material || !ehPreSessao(material.titulo)) {
    return (
      <Moldura>
        <p className="text-sm text-texto-suave">
          Este link não vale mais. Peça um novo para a sua tutora.
        </p>
      </Moldura>
    );
  }

  return (
    <Moldura titulo={material.titulo}>
      <FormularioPreSessao
        blocos={material.blocos}
        materialId={link.materialId}
        mentoradaId={link.mentoradaId}
        token={token}
        aoSalvar={() => {}}
      />
    </Moldura>
  );
}

function Moldura({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <Image
          src="/marca/la-fortuna.png"
          alt="La Fortuna Academy"
          width={2369}
          height={862}
          priority
          className="logo-marca mx-auto h-8 w-auto"
        />
        {titulo ? <h1 className="display mt-6 text-3xl">{titulo}</h1> : null}
      </div>
      <div className="rounded-2xl border border-borda bg-superficie p-5 sm:p-7">{children}</div>
    </main>
  );
}
