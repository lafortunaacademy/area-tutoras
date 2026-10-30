'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { assinarPreview, COOKIE_VER_COMO, COOKIE_VER_COMO_MENTORADA, exigirAdmin } from '@/lib/session';
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

/**
 * O mesmo "ver como", do lado das clientes: abre a área de membros como a
 * mentorada a vê, com o menu dela e sem nada do administrativo.
 */
export async function verComoMentorada(form: FormData) {
  await exigirAdmin();
  const mentoradaId = String(form.get('mentoradaId') ?? '');
  if (!mentoradaId) return;

  (await cookies()).set(COOKIE_VER_COMO_MENTORADA, assinarPreview(mentoradaId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect(`/mentoradas/${mentoradaId}`);
}

/** Nada de arquivo gigante vindo do navegador: 8 MB já é mais que uma foto de celular. */
const MAIOR_FOTO = 8 * 1024 * 1024;

/**
 * O retrato de quem é do time e não tem página na base Tutoras.
 *
 * A imagem é reduzida aqui mesmo, para um quadrado de 192px em webp, e guardada
 * inteira na linha da pessoa. São meia dúzia de retratos de uns 10 KB: um
 * bucket de arquivos só para isso seria mais peça para dar manutenção.
 */
export async function salvarFoto(_anterior: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  await exigirAdmin();

  const id = String(form.get('id') ?? '');
  const arquivo = form.get('foto');
  if (!id || !(arquivo instanceof File) || arquivo.size === 0) return { erro: 'Escolha uma imagem.' };
  if (!arquivo.type.startsWith('image/')) return { erro: 'Isso não é uma imagem.' };
  if (arquivo.size > MAIOR_FOTO) return { erro: 'A imagem é grande demais. Tente uma menor que 8 MB.' };

  const { default: sharp } = await import('sharp');
  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()))
      .rotate()
      .resize(192, 192, { fit: 'cover', position: 'top' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return { erro: 'Não consegui ler essa imagem. Tente um JPG ou PNG.' };
  }

  const { error } = await supabaseAdmin()
    .from('tutoras')
    .update({ foto: `data:image/webp;base64,${webp.toString('base64')}` })
    .eq('id', id);

  if (error) return { erro: 'Não consegui guardar a foto agora.' };

  revalidatePath('/admin');
  revalidatePath('/painel', 'layout');
  return { ok: 'Foto atualizada.' };
}

/** Tira o retrato e devolve a pessoa às iniciais. */
export async function removerFoto(form: FormData) {
  await exigirAdmin();
  const id = String(form.get('id') ?? '');
  if (!id) return;

  await supabaseAdmin().from('tutoras').update({ foto: null }).eq('id', id);
  revalidatePath('/admin');
  revalidatePath('/painel', 'layout');
}
