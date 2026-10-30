import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAcessoMentorada, getSessao } from '@/lib/session';
import { caminhoDoMaterial, formulario } from '@/lib/tutorias/modelo';
import { PainelDoFormulario } from '@/components/tutorias/PainelDoFormulario';
import { FormularioDoApp } from '@/components/tutorias/FormularioDoApp';
import { BotaoTema } from '@/components/BotaoTema';

export const dynamic = 'force-dynamic';

/**
 * O link de um formulário das tutorias — o mesmo para todas as mentoradas.
 * Quem abre entra com o próprio e-mail; a resposta cai na mentorada de quem
 * entrou. Sem login, vai para o login e volta para cá.
 */
export default async function FormularioPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const [material, caminho] = await Promise.all([
    formulario(materialId).catch(() => null),
    caminhoDoMaterial(materialId).catch(() => null),
  ]);

  if (!material || material.tipo !== 'formulario') {
    return (
      <Moldura>
        <p className="text-center text-sm text-texto-suave">Este formulário não existe mais. Peça o link novo para a sua tutora.</p>
      </Moldura>
    );
  }

  const tutoria = caminho?.grupos.at(-1) ?? caminho?.tutoria ?? null;
  const acima = caminho ? [`Pilar ${caminho.pilar}`, caminho.tutoria, ...caminho.grupos].filter((v, i, a) => a.indexOf(v) === i).join(' · ') : undefined;
  const titulo = tutoria ? `${material.nome} · ${tutoria}` : material.nome;

  const acesso = await getAcessoMentorada();
  if (!acesso) {
    // A equipe logada não responde por aqui: só vê de onde é o link.
    if (await getSessao()) {
      return (
        <Moldura acima={acima} titulo={titulo}>
          <div className="mb-6 rounded-lg bg-andamento-suave px-4 py-3 text-sm leading-relaxed text-andamento">
            <strong className="font-medium">Prévia da equipe.</strong> É assim que a mentorada vê este formulário. Pode
            clicar e escrever: nada é salvo. As respostas delas aparecem na página de{' '}
            <Link href="/mentoradas" className="underline underline-offset-2">
              Tutorias de cada mentorada
            </Link>
            .
          </div>
          <FormularioDoApp perguntas={material.perguntas} respostas={{}} mentoradaId="" podeEditar previa />
        </Moldura>
      );
    }
    redirect(`/login?proximo=${encodeURIComponent(`/formulario/${materialId}`)}`);
  }

  const nome = acesso.nome.split(' ')[0];
  return (
    <Moldura acima={acima} titulo={titulo}>
      <p className="mb-6 text-sm leading-relaxed text-texto-suave">
        Olá, {nome}! Este é o formulário de {material.nome.toLowerCase()}
        {tutoria ? (
          <>
            {' '}da tutoria de <strong className="font-medium text-texto">{tutoria}</strong>
          </>
        ) : null}
        . Responda com calma: o que você escreve fica salvo sozinho, e quando terminar é só clicar em{' '}
        <strong className="font-medium text-texto">Enviar respostas</strong>.
      </p>
      <PainelDoFormulario materialId={materialId} mentoradaId={acesso.notion_page_id} paraMentorada mostrarEnviadas={false} />
    </Moldura>
  );
}

function Moldura({ acima, titulo, children }: { acima?: string; titulo?: string; children: React.ReactNode }) {
  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-3xl px-4 py-10 sm:px-6">
      <BotaoTema className="absolute top-4 right-4" />
      <div className="mb-8 text-center">
        <Image
          src="/marca/la-fortuna.png"
          alt="La Fortuna Academy"
          width={2369}
          height={862}
          priority
          className="logo-marca mx-auto h-8 w-auto"
        />
        {acima ? <p className="mt-6 text-[12px] tracking-[0.3em] text-destaque uppercase">{acima}</p> : null}
        {titulo ? <h1 className="display mt-2 text-3xl sm:text-4xl">{titulo}</h1> : null}
      </div>
      <div className="rounded-2xl border border-borda bg-superficie p-5 sm:p-7">{children}</div>
    </main>
  );
}
