import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const sessao = await getSessao();
  redirect(sessao ? '/painel' : '/login');
}
