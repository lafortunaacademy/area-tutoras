import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_VER_COMO } from '@/lib/session';

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin', request.url), { status: 303 });
  res.cookies.delete(COOKIE_VER_COMO);
  return res;
}
