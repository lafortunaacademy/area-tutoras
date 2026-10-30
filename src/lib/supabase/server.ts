import 'server-only';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { COOKIE_DA_SESSAO, dominioDoCookie } from '@/lib/portas';

/** Client do Supabase para Server Components / Server Actions / Route Handlers. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  const dominio = dominioDoCookie((await headers()).get('host'));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // O crachá vale para as três portas: mesmo nome e mesmo domínio nas três.
      cookieOptions: { name: COOKIE_DA_SESSAO, domain: dominio },
      // Sem PKCE no link do e-mail.
      //
      // No modo padrão o Supabase manda um código que só fecha com a metade
      // guardada no navegador que pediu: abrir o e-mail no celular, ou em
      // outro perfil, não entra. Aqui o link leva um token que o nosso próprio
      // /auth/callback confere com o Supabase, e por isso vale em qualquer
      // navegador. É o que torna o link do e-mail um link de verdade.
      auth: { flowType: 'implicit' },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie: o refresh de sessão
            // acontece no proxy.ts, então é seguro ignorar aqui.
          }
        },
      },
    },
  );
}
