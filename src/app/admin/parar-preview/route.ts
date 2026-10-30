import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_VER_COMO, COOKIE_VER_COMO_MENTORADA } from '@/lib/session';

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
  res.cookies.delete(COOKIE_VER_COMO);
  res.cookies.delete(COOKIE_VER_COMO_MENTORADA);
  return res;
}
