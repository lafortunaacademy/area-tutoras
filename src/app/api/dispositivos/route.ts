import { NextResponse, type NextRequest } from 'next/server';
import { getAcessoMentorada } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { COOKIE_DO_CELULAR } from '@/lib/push';

/**
 * O app de celular avisa o token de notificação da mentorada logada. Só a
 * própria mentorada registra: o celular de quem administra não recebe os
 * avisos de ninguém.
 */
export async function POST(request: NextRequest) {
  const acesso = await getAcessoMentorada();
  if (!acesso) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });

  const corpo = (await request.json().catch(() => null)) as { token?: string; plataforma?: string } | null;
  const token = corpo?.token?.trim();
  const plataforma = corpo?.plataforma;
  if (!token || token.length > 4096 || (plataforma !== 'ios' && plataforma !== 'android')) {
    return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  }

  // O mesmo celular pode mudar de dona (outra pessoa entra nele): o token passa para quem está logada.
  const { error } = await supabaseAdmin()
    .from('dispositivos')
    .upsert(
      { token, plataforma, mentorada_id: normalizarId(acesso.notion_page_id), visto_em: new Date().toISOString() },
      { onConflict: 'token' },
    );
  if (error) return NextResponse.json({ erro: 'falhou' }, { status: 502 });

  // O logout lê este cookie para desligar as notificações deste celular.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_DO_CELULAR, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 400 });
  return res;
}
