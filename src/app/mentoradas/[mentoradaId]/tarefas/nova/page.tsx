import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { FormularioTarefa } from '@/components/area-mentorada/FormularioTarefa';

export const dynamic = 'force-dynamic';

export default async function NovaTarefaPage({ params }: { params: Promise<{ mentoradaId: string }> }) {
  await exigirAdmin();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/mentoradas/${mentorada.id}#tarefas`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl">Nova tarefa</h1>
      <p className="mt-1 mb-8 text-sm text-texto-suave">Tarefas da mentoria de {mentorada.nome}</p>

      <FormularioTarefa mentoradaId={mentorada.id} />
    </div>
  );
}
