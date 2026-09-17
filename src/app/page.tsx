import { redirect } from 'next/navigation';
import { getAcessoMentorada, getSessao } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Tutora (e admin) vai para o painel; mentorada, direto para a área dela.
  if (await getSessao()) redirect('/painel');

  const acesso = await getAcessoMentorada();
  redirect(acesso ? `/mentoradas/${acesso.notion_page_id}` : '/login');
}
