'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { assinarPreview, COOKIE_VER_COMO, exigirAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';

/**
 * Liga o preview de uma tutora.
 *
 * O cookie guarda o ID assinado com HMAC, mas a assinatura sozinha não
 * autoriza nada: `getSessao` reconfere no banco, a cada requisição, que quem
 * está logada continua sendo admin.
 */
export async function verComo(form: FormData) {
  await exigirAdmin();
  const tutoraId = String(form.get('tutoraId') ?? '');
  if (!tutoraId) return;

  (await cookies()).set(COOKIE_VER_COMO, assinarPreview(tutoraId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect('/painel');
}

export type EstadoAcesso = { erro?: string; ok?: string };

/**
 * Libera o acesso de uma mentorada ao app com um e-mail. O e-mail é o que ela
 * usa para entrar — não precisa ser o do Notion. Uma mentorada pode ter mais
 * de um e-mail.
 */
export async function liberarAcesso(_anterior: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  await exigirAdmin();
  const mentoradaId = normalizarId(String(form.get('mentoradaId') ?? ''));
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Digite um e-mail válido.' };

  const mentorada = (await mentoradasDoModeloNovo()).find((m) => m.id === mentoradaId);
  if (!mentorada) return { erro: 'Mentorada não encontrada.' };

  const db = supabaseAdmin();
  const { data: tutora } = await db.from('tutoras').select('id').eq('email', email).maybeSingle();
  if (tutora) return { erro: 'Esse e-mail já é de uma tutora.' };

  const { data: existente } = await db.from('mentoradas_acesso').select('notion_page_id').eq('email', email).maybeSingle();
  if (existente && normalizarId(existente.notion_page_id) !== mentoradaId) {
    return { erro: 'Esse e-mail já está liberado para outra mentorada.' };
  }

  const { error } = await db
    .from('mentoradas_acesso')
    .upsert({ email, nome: mentorada.nome, notion_page_id: mentoradaId, ativa: true }, { onConflict: 'email' });
  if (error) return { erro: 'Não foi possível liberar agora.' };

  // Ninguém se cadastra sozinho: o usuário do login é criado aqui, junto com a liberação.
  const { error: erroAuth } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (erroAuth && !/already|exists|registered/i.test(erroAuth.message)) {
    return { erro: 'Acesso liberado, mas o login não foi criado. Tente de novo.' };
  }

  revalidatePath('/admin');
  return { ok: `${email} liberado.` };
}

/** Tira o acesso de um e-mail. A mentorada deixa de conseguir entrar com ele. */
export async function removerAcesso(form: FormData) {
  await exigirAdmin();
  const id = String(form.get('id') ?? '');
  if (!id) return;
  await supabaseAdmin().from('mentoradas_acesso').delete().eq('id', id);
  revalidatePath('/admin');
}
