import { redirect } from 'next/navigation';
import { getSessao } from '@/lib/session';

export default async function Home() {
  const sessao = await getSessao();
  redirect(sessao ? '/painel' : '/login');
}
