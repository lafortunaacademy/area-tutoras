'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAcessoMentorada } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { COOKIE_DO_CELULAR } from '@/lib/push';

/**
 * A mentorada exclui a própria conta (as lojas exigem que dê para fazer isso
 * de dentro do app).
 *
 * O acesso é desligado, não apagado: a linha fica com `ativa = false`, e é
 * isso que impede a sincronização com o cadastro do Notion de criar o acesso
 * de novo. Saem o usuário de login e os celulares. O conteúdo da mentoria está
 * no Notion e é da La Fortuna: o pedido aparece no Administrativo.
 */
export async function excluirMinhaConta(form: FormData): Promise<void> {
  const acesso = await getAcessoMentorada();
  if (!acesso) redirect('/login');
  if (form.get('confirmo') !== 'sim') redirect('/conta/excluir');

  const db = supabaseAdmin();
  const mentoradaId = normalizarId(acesso.notion_page_id);
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await db.from('mentoradas_acesso').update({ ativa: false, excluida_em: new Date().toISOString() }).eq('id', acesso.id);
  await db.from('dispositivos').delete().eq('mentorada_id', mentoradaId);
  await db.from('exclusoes_de_conta').insert({ email: acesso.email, nome: acesso.nome, mentorada_id: mentoradaId });

  await supabase.auth.signOut();
  // Quem também é do time continua precisando do login: só apaga o usuário de quem é só mentorada.
  const { data: doTime } = await db.from('tutoras').select('id').eq('email', acesso.email).maybeSingle();
  if (user && !doTime) await db.auth.admin.deleteUser(user.id);

  (await cookies()).delete(COOKIE_DO_CELULAR);
  redirect('/conta/excluir?feito=1');
}
