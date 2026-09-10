'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { assinarPreview, COOKIE_VER_COMO, exigirAdmin } from '@/lib/session';

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
