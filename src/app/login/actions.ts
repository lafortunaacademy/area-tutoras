'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { caminhoSeguro, COOKIE_DEPOIS_DO_LOGIN } from '@/lib/depoisDoLogin';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type EstadoLogin = { erro?: string; enviado?: boolean; email?: string };

export async function enviarMagicLink(
  _anterior: EstadoLogin,
  form: FormData,
): Promise<EstadoLogin> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return { erro: 'Digite um e-mail válido.' };
  }

  // Só e-mail cadastrado recebe link — de tutora ou de mentorada. `shouldCreateUser: false` no signInWithOtp
  // já barraria a criação, mas conferir aqui evita mandar e-mail para quem não
  // é tutora — e devolve a mesma mensagem nos dois casos, para não revelar
  // quem está ou não cadastrada.
  const db = supabaseAdmin();
  const [{ data: tutora }, { data: mentorada }] = await Promise.all([
    db.from('tutoras').select('id').eq('email', email).eq('ativa', true).maybeSingle(),
    db.from('mentoradas_acesso').select('id').eq('email', email).eq('ativa', true).maybeSingle(),
  ]);

  if (!tutora && !mentorada) return { enviado: true, email };

  // Veio de um formulário: guarda para onde voltar quando ela clicar no link do e-mail.
  const proximo = caminhoSeguro(String(form.get('proximo') ?? ''));
  if (proximo) {
    (await cookies()).set(COOKIE_DEPOIS_DO_LOGIN, proximo, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 });
  }

  const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;
  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/callback`,
    },
  });

  if (error) {
    // A mensagem genérica escondia o motivo mais comum: o SMTP embutido do
    // Supabase libera poucos e-mails por hora, e "tente de novo em instantes"
    // manda a pessoa bater de novo numa porta que vai continuar fechada.
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      return {
        erro: 'Limite de e-mails do Supabase atingido. Espere cerca de uma hora, ou configure um SMTP próprio.',
      };
    }
    console.error('[login] signInWithOtp falhou:', error.message);
    return { erro: 'Não consegui enviar o link agora. Tente de novo em instantes.' };
  }

  return { enviado: true, email };
}

/**
 * Entrar com o código de 6 dígitos do mesmo e-mail. É o caminho do app de
 * celular: o botão do e-mail abriria o navegador, fora do app, e a sessão
 * ficaria lá. Digitado aqui, o código loga na própria tela em que foi pedido.
 */
export async function entrarComCodigo(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const codigo = String(form.get('codigo') ?? '').replace(/\D/g, '');
  if (!email) return { erro: 'Peça o código de novo.' };
  if (codigo.length < 6) return { enviado: true, email, erro: 'Digite os números do código que chegou no e-mail.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' });
  if (error) {
    return { enviado: true, email, erro: 'Esse código não vale: confira os números ou peça um novo.' };
  }

  // A página inicial manda cada uma para a própria área; o formulário de onde ela veio tem prioridade.
  const jar = await cookies();
  const guardado = caminhoSeguro(jar.get(COOKIE_DEPOIS_DO_LOGIN)?.value);
  if (guardado) jar.delete(COOKIE_DEPOIS_DO_LOGIN);
  redirect(guardado ?? '/');
}
