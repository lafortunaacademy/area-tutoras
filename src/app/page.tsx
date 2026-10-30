import { redirect } from 'next/navigation';
import { destinoDepoisDoLogin, getAcessoMentorada, getSessao } from '@/lib/session';

// Depende da sessão do request: nunca pode virar HTML estático.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Quem administra vai para a área inicial, a tutora para o painel e a
  // mentorada direto para a área dela. É a mesma conta de depois do login.
  if (await getSessao()) redirect(await destinoDepoisDoLogin());

  const acesso = await getAcessoMentorada();
  redirect(acesso ? `/mentoradas/${acesso.notion_page_id}` : '/login');
}
