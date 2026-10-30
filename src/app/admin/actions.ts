'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { assinarPreview, COOKIE_VER_COMO, exigirAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { tutorasDoHub } from '@/lib/notion/hub';

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

/**
 * Liga e desliga o acesso de alguém sem apagar o cadastro.
 *
 * Desligar é o caminho normal quando alguém sai: o e-mail continua na lista,
 * ligado à mesma página do Notion, e volta a funcionar com um clique.
 */
export async function alternarAcesso(form: FormData) {
  await exigirAdmin();
  const tabela = String(form.get('tabela') ?? '');
  const id = String(form.get('id') ?? '');
  if ((tabela !== 'tutoras' && tabela !== 'mentoradas_acesso') || !id) return;

  await supabaseAdmin()
    .from(tabela)
    .update({ ativa: String(form.get('ativa') ?? '') === 'true' })
    .eq('id', id);
  revalidatePath('/admin');
}

/**
 * Libera o acesso de alguém do time interno.
 *
 * Tutora precisa existir na base Tutoras do Notion: é o ID dela lá que recorta
 * tudo o que ela vê. Administradora não — quem administra enxerga tudo por
 * outro caminho, e o atendimento da Fernanda não é tutora de ninguém. Por isso
 * o nome dela é digitado aqui, e não escolhido numa lista.
 */
export async function liberarAcessoTutora(_anterior: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  await exigirAdmin();
  const admin = String(form.get('tipo') ?? '') === 'admin';
  const tutoraId = normalizarId(String(form.get('tutoraId') ?? ''));
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Digite um e-mail válido.' };

  let nome = String(form.get('nome') ?? '').trim();
  if (admin) {
    if (nome.length < 2) return { erro: 'Escreva o nome de quem vai entrar.' };
  } else {
    const tutora = (await tutorasDoHub()).find((t) => normalizarId(t.id) === tutoraId);
    if (!tutora) return { erro: 'Escolha na lista quem é.' };
    nome = tutora.nome;
  }

  const db = supabaseAdmin();
  const { data: cliente } = await db.from('mentoradas_acesso').select('id').eq('email', email).maybeSingle();
  if (cliente) return { erro: 'Esse e-mail já é de uma cliente.' };

  // `upsert` por e-mail: só as colunas enviadas mudam, então quem já era admin
  // continua sendo.
  const { error } = await db.from('tutoras').upsert(
    // Sem página no HUB, o campo fica vazio: é o caso de quem administra sem
    // dar tutoria. O recorte por tutora simplesmente não encontra nada dela.
    { email, nome, notion_tutora_page_id: admin ? '' : tutoraId, ativa: true, is_admin: admin },
    { onConflict: 'email' },
  );
  if (error) return { erro: 'Não foi possível liberar agora.' };

  const { error: erroAuth } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (erroAuth && !/already|exists|registered/i.test(erroAuth.message)) {
    return { erro: 'Acesso liberado, mas o login não foi criado. Tente de novo.' };
  }

  revalidatePath('/admin');
  return { ok: `${email} liberado.` };
}

/**
 * Troca o tipo de acesso de alguém do time: administradora vê tudo e mexe nas
 * configurações; tutora vê só as mentoradas dela.
 *
 * Ninguém muda o próprio tipo — tirar o próprio acesso de administradora
 * trancaria a porta por dentro, e o app não tem outra chave.
 */
export async function alternarTipo(form: FormData) {
  const sessao = await exigirAdmin();
  const id = String(form.get('id') ?? '');
  if (!id || id === sessao.real.id) return;

  await supabaseAdmin()
    .from('tutoras')
    .update({ is_admin: String(form.get('tipo') ?? '') === 'admin' })
    .eq('id', id);
  revalidatePath('/admin');
}

/** Apaga o cadastro de alguém do time. Para quem só saiu, o interruptor basta. */
export async function removerDoTime(form: FormData) {
  const sessao = await exigirAdmin();
  const id = String(form.get('id') ?? '');
  if (!id || id === sessao.real.id) return;

  await supabaseAdmin().from('tutoras').delete().eq('id', id);
  revalidatePath('/admin');
}
