import { redirect } from 'next/navigation';

/** A porta de entrada do painel é o Início, não a lista. */
export default function PainelPage() {
  redirect('/painel/inicio');
}
