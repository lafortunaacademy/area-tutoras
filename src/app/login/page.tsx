import { redirect } from 'next/navigation';
import { getSessao, supabaseConfigurado } from '@/lib/session';
import { FormularioLogin } from './FormularioLogin';

export default async function LoginPage() {
  if (await getSessao()) redirect('/painel');

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-texto-suave">
            La Fortuna Academy
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Área das tutoras</h1>
          <p className="mt-2 text-sm text-texto-suave">
            Entre com o e-mail cadastrado. Enviamos um link de acesso — sem senha.
          </p>
        </div>

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
