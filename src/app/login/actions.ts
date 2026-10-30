'use server';

import { cookies, headers } from 'next/headers';
import { caminhoSeguro, COOKIE_DEPOIS_DO_LOGIN } from '@/lib/depoisDoLogin';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { NOME_DA_PORTA, portaDoHost, urlDaPorta, type Porta } from '@/lib/portas';

export type EstadoLogin = {
  erro?: string;
  enviado?: boolean;
  /** Bateu na porta errada: a tela mostra qual é a dela e leva para lá. */
  portaCerta?: { nome: string; url: string };
};

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
    db.from('tutoras').select('id, is_admin').eq('email', email).eq('ativa', true).maybeSingle<{ id: string; is_admin: boolean }>(),
    db.from('mentoradas_acesso').select('id').eq('email', email).eq('ativa', true).maybeSingle(),
  ]);

  if (!tutora && !mentorada) return { enviado: true };

  // Cada público tem o seu endereço. Quem bate na porta errada não recebe link
  // por ali: recebe o caminho de casa.
  const daPessoa: Porta = tutora ? (tutora.is_admin ? 'equipe' : 'tutoras') : 'clientes';
  const daPorta = portaDoHost((await headers()).get('host'));

  if (daPorta && daPorta !== daPessoa) {
    const url = urlDaPorta(daPessoa, email);
    if (url) return { portaCerta: { nome: NOME_DA_PORTA[daPessoa], url } };
  }

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

  return { enviado: true };
}
