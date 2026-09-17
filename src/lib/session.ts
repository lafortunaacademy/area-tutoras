import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const COOKIE_VER_COMO = 'ver_como';

export type Tutora = {
  id: string;
  email: string;
  nome: string;
  notion_tutora_page_id: string;
  ativa: boolean;
  is_admin: boolean;
};

export type Sessao = {
  /** A tutora cujos dados estão sendo exibidos. */
  tutora: Tutora;
  /** Quem está de fato logada. Igual a `tutora`, exceto durante um "ver como". */
  real: Tutora;
  verComo: boolean;
};

function segredo(): string {
  const s = process.env.PREVIEW_COOKIE_SECRET;
  if (!s) throw new Error('PREVIEW_COOKIE_SECRET não configurado.');
  return s;
}

function assinar(valor: string): string {
  return createHmac('sha256', segredo()).update(valor).digest('hex');
}

export function assinarPreview(tutoraId: string): string {
  return `${tutoraId}.${assinar(tutoraId)}`;
}

/** Devolve o ID só se a assinatura confere — um cookie forjado não passa. */
function lerPreview(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const corte = cookie.lastIndexOf('.');
  if (corte < 1) return null;

  const id = cookie.slice(0, corte);
  const mac = cookie.slice(corte + 1);
  const esperado = assinar(id);

  if (mac.length !== esperado.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;
  return id;
}

/**
 * Sessão da requisição. É o único ponto do app que decide "quem é você".
 *
 * O cookie de "ver como" nunca é confiado sozinho: além da assinatura, o
 * servidor reconfirma no banco que quem está logada é admin. Perder o admin
 * derruba o preview na hora.
 */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function getSessao(): Promise<Sessao | null> {
  // Sem credenciais não há sessão possível — a tela de login diz o que falta
  // em vez de estourar um stack trace.
  if (!supabaseConfigurado()) return null;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const db = supabaseAdmin();
  const { data: real } = await db
    .from('tutoras')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .maybeSingle<Tutora>();

  if (!real || !real.ativa) return null;

  const preview = lerPreview((await cookies()).get(COOKIE_VER_COMO)?.value);
  if (preview && real.is_admin && preview !== real.id) {
    const { data: alvo } = await db
      .from('tutoras')
      .select('*')
      .eq('id', preview)
      .maybeSingle<Tutora>();

    if (alvo) return { tutora: alvo, real, verComo: true };
  }

  return { tutora: real, real, verComo: false };
}

/**
 * Acesso de uma mentorada à área de membros. Não é tutora: entra com o próprio
 * e-mail e só enxerga a própria página.
 */
export type AcessoMentorada = {
  id: string;
  email: string;
  nome: string;
  notion_page_id: string;
  ativa: boolean;
};

export async function getAcessoMentorada(): Promise<AcessoMentorada | null> {
  if (!supabaseConfigurado()) return null;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabaseAdmin()
    .from('mentoradas_acesso')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .maybeSingle<AcessoMentorada>();

  return data?.ativa ? data : null;
}

/**
 * Quem está vendo a área das mentoradas: o administrativo (vê todas) ou uma
 * mentorada (vê só a própria página).
 */
export type Visitante = {
  nome: string;
  admin: boolean;
  /** Preenchido só quando quem entrou é a própria mentorada. */
  mentoradaId: string | null;
};

export async function getVisitante(): Promise<Visitante | null> {
  const sessao = await getSessao();
  if (sessao) {
    return sessao.real.is_admin ? { nome: sessao.real.nome, admin: true, mentoradaId: null } : null;
  }

  const acesso = await getAcessoMentorada();
  return acesso ? { nome: acesso.nome, admin: false, mentoradaId: acesso.notion_page_id } : null;
}

/** Porta da área das mentoradas: admin ou mentorada com acesso. */
export async function exigirVisitante(): Promise<Visitante> {
  const visitante = await getVisitante();
  if (!visitante) redirect((await getSessao()) ? '/painel' : '/login');
  return visitante;
}

/** A mesma porta, para uma mentorada específica: a própria mentorada ou o admin. */
export async function exigirAcessoAMentorada(mentoradaId: string): Promise<Visitante> {
  const visitante = await exigirVisitante();
  const { normalizarId } = await import('@/lib/notion/carteira');
  if (!visitante.admin && normalizarId(visitante.mentoradaId ?? '') !== normalizarId(mentoradaId)) {
    redirect(`/mentoradas/${visitante.mentoradaId}`);
  }
  return visitante;
}

/** Para onde mandar quem acabou de entrar. */
export async function destinoDepoisDoLogin(): Promise<string> {
  if (await getSessao()) return '/painel';
  const acesso = await getAcessoMentorada();
  return acesso ? `/mentoradas/${acesso.notion_page_id}` : '/painel';
}

/** Igual a `getSessao`, mas manda para o login em vez de devolver null. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) redirect('/login');
  return sessao;
}

export async function exigirAdmin(): Promise<Sessao> {
  const sessao = await exigirSessao();
  if (!sessao.real.is_admin) redirect('/painel');
  return sessao;
}
