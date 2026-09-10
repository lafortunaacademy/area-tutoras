import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/carteira';
import { FormularioHandsoff } from './FormularioHandsoff';

export const dynamic = 'force-dynamic';

export default async function NovoHandsoffPage({
  params,
}: {
  params: Promise<{ mentoradaId: string }>;
}) {
  const sessao = await exigirSessao();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentorada(sessao.tutora.notion_tutora_page_id, mentoradaId);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/painel/${mentorada.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">Novo hands-off</h1>
      <p className="mt-1 mb-8 text-sm text-texto-suave">
        O que você escrever aqui vira uma página na base Hands-off do Notion, no mesmo formato
        de sempre.
      </p>

      <FormularioHandsoff mentoradaId={mentorada.id} />
    </div>
  );
}
