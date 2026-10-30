import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { COOKIE_VER_COMO } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { COOKIE_DO_CELULAR } from '@/lib/push';

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  // Saiu da conta no app: este celular para de receber as notificações dela.
  const celular = request.cookies.get(COOKIE_DO_CELULAR)?.value;
  if (celular) await supabaseAdmin().from('dispositivos').delete().eq('token', celular);

  const res = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  res.cookies.delete(COOKIE_VER_COMO);
  res.cookies.delete(COOKIE_DO_CELULAR);
  return res;
}
