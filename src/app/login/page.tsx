import { redirect } from 'next/navigation';
import { getSessao, supabaseConfigurado } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';
import { FormularioLogin } from './FormularioLogin';

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
  if (await getSessao()) redirect('/painel');

  const { erro } = await searchParams;
  const aviso = erro ? (MENSAGENS[erro] ?? 'Não consegui te autenticar. Peça um novo link.') : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="rotulo text-xs text-texto-suave">
            La Fortuna Academy
          </p>
          <h1 className="display mt-3 text-3xl">Área das tutoras</h1>
          <p className="mt-2 text-sm text-texto-suave">
            Entre com o e-mail cadastrado. Enviamos um link de acesso — sem senha.
          </p>
        </div>

        {aviso ? (
          <p className="mb-4 rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{aviso}</p>
        ) : null}

        {supabaseConfigurado() ? (
          <FormularioLogin />
        ) : (
          <div className="rounded-xl border border-dashed border-borda p-5 text-sm text-texto-suave">
            Faltam as credenciais do Supabase. Copie <code>.env.local.example</code> para{' '}
            <code>.env.local</code> e preencha antes de entrar.
          </div>
        )}
      </div>
    </main>
  );
}
