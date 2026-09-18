import Image from 'next/image';
import { redirect } from 'next/navigation';
import { destinoDepoisDoLogin, getAcessoMentorada, getSessao, supabaseConfigurado } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';
import { FormularioLogin } from './FormularioLogin';
import { BotaoTema } from '@/components/BotaoTema';

const MENSAGENS: Record<string, string> = {
  link_invalido: 'Esse link não veio completo. Peça um novo abaixo.',
  link_expirado:
    'Esse link não vale mais — ou já foi usado, ou foi pedido em outro navegador. Peça um novo abaixo.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if ((await getSessao()) || (await getAcessoMentorada())) redirect(await destinoDepoisDoLogin());

  const { erro } = await searchParams;
  const aviso = erro ? (MENSAGENS[erro] ?? 'Não consegui te autenticar. Peça um novo link.') : null;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-16">
      {/* Luz suave de fundo, no tom da marca. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 30rem at 70% -10%, color-mix(in oklab, var(--destaque) 22%, transparent), transparent 70%), radial-gradient(40rem 24rem at 0% 110%, color-mix(in oklab, var(--marca-suave) 70%, transparent), transparent 70%)',
        }}
      />

      <BotaoTema className="absolute top-4 right-4 sm:top-6 sm:right-6" />

      <div className="relative w-full max-w-md">
        <div className="mb-10 text-center">
          <Image
            src="/marca/la-fortuna.png"
            alt="La Fortuna Academy"
            width={2369}
            height={862}
            priority
            className="logo-marca mx-auto h-16 w-auto sm:h-20"
          />
          <p className="mt-6 text-[11px] tracking-[0.35em] text-destaque uppercase">Painel interno</p>
          <p className="mt-3 text-sm text-texto-suave sm:text-base">
            Área da equipe. Entre pelo link que chega no seu e-mail.
          </p>
        </div>

        {aviso ? (
          <p className="mb-4 rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{aviso}</p>
        ) : null}

        <div className="rounded-2xl border border-borda bg-superficie p-6 shadow-[var(--sombra)] sm:p-8">
          {supabaseConfigurado() ? (
            <FormularioLogin />
          ) : (
            <p className="text-sm text-texto-suave">
              Faltam as credenciais do Supabase. Copie <code>.env.local.example</code> para{' '}
              <code>.env.local</code> e preencha antes de entrar.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-texto-suave">Acesso restrito ao time da La Fortuna Academy.</p>
      </div>
    </main>
  );
}
