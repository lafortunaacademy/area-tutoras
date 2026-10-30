import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Só renova o cookie de sessão do Supabase (no Next 16 isto se chama proxy,
 * não middleware).
 *
 * Autorização de verdade NÃO acontece aqui: quem decide o que cada tutora vê é
 * o servidor, em `session.ts` e `carteira.ts`, a cada requisição.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Sem credenciais não há sessão para renovar: deixa a requisição seguir para
  // a tela de login, que explica o que falta configurar.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  return renovarSessao(request, response);
}

async function renovarSessao(request: NextRequest, inicial: NextResponse) {
  let response = inicial;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  // Marca de que a renovação passou por aqui. É o único jeito de saber, de
  // fora, se o proxy está mesmo rodando em produção: sem ele o cookie de
  // sessão nunca é renovado e a pessoa é deslogada quando o token vence.
  response.headers.set('x-sessao-renovada', '1');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
