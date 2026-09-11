import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { exigirSessao } from '@/lib/session';
import { exigirMentorada } from '@/lib/notion/guard';
import { normalizarId } from '@/lib/notion/carteira';
import { paginaPertenceA } from '@/lib/notion/mentorada';
import { lerHandsoff } from '@/lib/notion/handsoff';
import { getPage } from '@/lib/notion/client';
import { relationIds } from '@/lib/notion/props';
import { HANDSOFF } from '@/lib/notion/config';
import { FormularioHandsoff } from '../../FormularioHandsoff';

export const dynamic = 'force-dynamic';

export default async function EditarHandsoffPage({
  params,
}: {
  params: Promise<{ mentoradaId: string; handsoffId: string }>;
}) {
  const sessao = await exigirSessao();
  const { mentoradaId, handsoffId } = await params;
  const tutoraId = sessao.tutora.notion_tutora_page_id;

  const mentorada = await exigirMentorada(tutoraId, mentoradaId);
  const alvo = normalizarId(handsoffId);

  if (!(await paginaPertenceA(mentorada, alvo))) notFound();

  // Editar é diferente de ver: registro de outra tutora fica só de leitura, para
  // ninguém reescrever sessão que não conduziu.
  const page = await getPage(alvo);
  const daTutora = relationIds(page, HANDSOFF.feitoPelaTutora).some(
    (id) => normalizarId(id) === normalizarId(tutoraId),
  );
  if (!daTutora) notFound();

  const atual = await lerHandsoff(alvo);

  return (
    <div className="max-w-2xl">
      <Link
        href={`/painel/${mentorada.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-2xl">Editar hands-off</h1>
      <p className="mt-1 mb-8 text-sm text-texto-suave">
        As alterações substituem o que está registrado nesta sessão.
      </p>

      <FormularioHandsoff
        mentoradaId={mentorada.id}
        handsoffId={alvo}
        valores={{ dataSessao: atual.dataSessao, secoes: atual.secoes }}
      />
    </div>
  );
}
