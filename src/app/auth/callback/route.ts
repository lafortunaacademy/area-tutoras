import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { destinoDepoisDoLogin } from '@/lib/session';
import { caminhoSeguro, COOKIE_DEPOIS_DO_LOGIN } from '@/lib/depoisDoLogin';

/** Volta para onde a pessoa estava (o formulário), se houver; senão, a área dela. */
async function destino(): Promise<string> {
  const jar = await cookies();
  const guardado = caminhoSeguro(jar.get(COOKIE_DEPOIS_DO_LOGIN)?.value);
  if (guardado) {
    jar.delete(COOKIE_DEPOIS_DO_LOGIN);
    return guardado;
  }
  return destinoDepoisDoLogin();
}

/**
 * Fim do magic link. Aceita as duas formas que o Supabase usa:
 *
 * - `?code=` (PKCE): o padrão quando o link foi PEDIDO pelo próprio app, que
 *   guardou metade do par num cookie. Só fecha no mesmo navegador.
 * - `?token_hash=&type=`: link verificável sozinho, sem depender de cookie.
 *   É o que sai de um link gerado pelo admin, e o que funciona quando a pessoa
 *   abre o e-mail em outro navegador ou no celular.
 *
 * Suportar os dois evita a classe de erro mais chata aqui: link válido que não
 * abre porque foi clicado "no lugar errado".
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = await supabaseServer();

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error('[auth/callback] verifyOtp falhou:', error.message);
      return NextResponse.redirect(`${origin}/login?erro=link_expirado`);
    }
    return NextResponse.redirect(`${origin}${await destino()}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] troca de código falhou:', error.message);
      return NextResponse.redirect(`${origin}/login?erro=link_expirado`);
    }
    return NextResponse.redirect(`${origin}${await destino()}`);
  }

  return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
}
