import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { COOKIE_VER_COMO } from '@/lib/session';

export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  res.cookies.delete(COOKIE_VER_COMO);
  return res;
}
