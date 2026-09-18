import Image from 'next/image';
import { lerLinkDePreenchimento } from '@/lib/linkDePreenchimento';
import { caminhoDoMaterial, formulario } from '@/lib/tutorias/modelo';
import { carteiraDaTutora, normalizarId } from '@/lib/notion/carteira';
import { PainelDoFormulario } from '@/components/tutorias/PainelDoFormulario';

export const dynamic = 'force-dynamic';

/**
 * Página do link de preenchimento, feita para a mentorada: diz de qual tutoria
 * é o formulário, e é só isso que abre por aqui — sem login, sem mais nada dela.
 */
export default async function PreenchimentoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = lerLinkDePreenchimento(token);
  const [material, caminho, carteira] = link
    ? await Promise.all([
        formulario(link.materialId).catch(() => null),
        caminhoDoMaterial(link.materialId).catch(() => null),
        carteiraDaTutora().catch(() => []),
      ])
    : [null, null, []];

  if (!link || !material || material.tipo !== 'formulario') {
    return (
      <Moldura>
        <p className="text-center text-sm text-texto-suave">Este link não vale mais. Peça um novo para a sua tutora.</p>
      </Moldura>
    );
  }

  const nome = carteira.find((m) => m.id === normalizarId(link.mentoradaId))?.nome.split(' ')[0];
  const tutoria = caminho ? [caminho.tutoria, ...caminho.grupos].filter((v, i, a) => a.indexOf(v) === i).join(' · ') : null;

  return (
    <Moldura
      acima={caminho ? `Pilar ${caminho.pilar}${tutoria ? ` · ${tutoria}` : ''}` : undefined}
      titulo={tutoria ? `${material.nome} · ${caminho!.grupos.at(-1) ?? caminho!.tutoria}` : material.nome}
    >
      <p className="mb-6 text-sm leading-relaxed text-texto-suave">
        {nome ? `Olá, ${nome}! ` : 'Olá! '}
        Este é o formulário de {material.nome.toLowerCase()} da tutoria de{' '}
        <strong className="font-medium text-texto">{caminho?.grupos.at(-1) ?? caminho?.tutoria ?? 'mentoria'}</strong>. Responda com
        calma: o que você escreve fica salvo sozinho, e quando terminar é só clicar em <strong className="font-medium text-texto">Enviar respostas</strong>.
      </p>
      <PainelDoFormulario materialId={link.materialId} mentoradaId={link.mentoradaId} token={token} paraMentorada mostrarEnviadas={false} />
    </Moldura>
  );
}

function Moldura({ acima, titulo, children }: { acima?: string; titulo?: string; children: React.ReactNode }) {
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
        {acima ? <p className="mt-6 text-[11px] tracking-[0.3em] text-destaque uppercase">{acima}</p> : null}
        {titulo ? <h1 className="display mt-2 text-3xl sm:text-4xl">{titulo}</h1> : null}
      </div>
      <div className="rounded-2xl border border-borda bg-superficie p-5 sm:p-7">{children}</div>
    </main>
  );
}
