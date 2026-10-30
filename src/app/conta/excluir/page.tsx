import type { Metadata } from 'next';
import Link from 'next/link';
import { getAcessoMentorada } from '@/lib/session';
import { excluirMinhaConta } from './actions';

export const metadata: Metadata = { title: 'Excluir minha conta — La Fortuna Academy' };
export const dynamic = 'force-dynamic';

/**
 * Exclusão da conta pela própria mentorada. Também é o endereço que a Google
 * Play pede para "exclusão de conta": aberto sem login, explica o que fazer.
 */
export default async function ExcluirContaPage({ searchParams }: { searchParams: Promise<{ feito?: string }> }) {
  const { feito } = await searchParams;
  const acesso = feito ? null : await getAcessoMentorada();

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-sm leading-relaxed text-texto-suave">
      <h1 className="display text-3xl text-texto">Excluir minha conta</h1>

      {feito ? (
        <p className="mt-6">
          Pronto: a sua conta foi excluída e as notificações pararam. A equipe da La Fortuna foi avisada e apaga os
          registros da sua mentoria, exceto o que a lei obrigar a guardar.
        </p>
      ) : acesso ? (
        <form action={excluirMinhaConta} className="mt-6 space-y-5">
          <p>
            Você, <strong className="font-medium text-texto">{acesso.nome}</strong>, deixa de entrar na área da La
            Fortuna com <strong className="font-medium text-texto">{acesso.email}</strong>, no app e no navegador. As
            notificações param na hora.
          </p>
          <p>
            Os registros da sua mentoria (sessões, tarefas, respostas) são apagados pela equipe, exceto o que a lei
            obrigar a guardar. Se você ainda está em mentoria, fale com a equipe antes: sem a conta, você não vê mais a
            sua área.
          </p>
          <label className="flex items-start gap-3 text-texto">
            <input type="checkbox" name="confirmo" value="sim" required className="mt-1" />
            Entendi e quero excluir a minha conta.
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="rounded-lg bg-parado px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Excluir minha conta
            </button>
            <Link href="/" className="underline underline-offset-2">
              Voltar
            </Link>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-6">
            Para excluir a sua conta, entre na sua área com o e-mail cadastrado e volte a esta página, ou escreva para{' '}
            <a href="mailto:contato@lafortunaacademy.com.br" className="text-marca underline underline-offset-2">
              contato@lafortunaacademy.com.br
            </a>{' '}
            pedindo a exclusão.
          </p>
          <Link
            href="/login?proximo=/conta/excluir"
            className="mt-6 inline-block rounded-lg bg-marca px-4 py-3 text-sm font-medium text-marca-contraste"
          >
            Entrar
          </Link>
        </>
      )}

      <p className="mt-10 text-xs">
        <Link href="/privacidade" className="underline underline-offset-2">
          Política de privacidade
        </Link>
      </p>
    </main>
  );
}
