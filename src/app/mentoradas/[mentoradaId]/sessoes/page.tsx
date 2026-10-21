import Link from 'next/link';
import { ArrowLeft, Video } from 'lucide-react';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { ordenarCiclos } from '@/lib/notion/config';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco } from '@/components/area-mentorada/Bloco';
import { ListaDeSessoes } from '@/components/area-mentorada/ListaDeSessoes';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';

export const dynamic = 'force-dynamic';

/** Página do cartão "Sessões": as sessões da mentorada, só para ver. */
export default async function SessoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { mentoradaId } = await params;
  const visitante = await exigirAcessoAMentorada(mentoradaId);
  const { ano: anoPedido } = await searchParams;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const dados = await sessoesPorCiclo(mentorada).catch((e) => e as Error);

  // Só os ciclos marcados no Notion nas sessões dela viram botão.
  const todos = ordenarCiclos(dados instanceof Error ? [] : dados.ciclos);
  const ciclo = anoPedido && todos.includes(anoPedido) ? anoPedido : (todos[0] ?? '');
  const sessoes = dados instanceof Error ? dados : dados.sessoes.filter((s) => s.ciclo === ciclo);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">Sessões</h1>
      <p className="mt-1 mb-6 text-sm text-texto-suave">{mentorada.nome}</p>

      <div className="mb-4">
        <SeletorDeAno anos={todos} selecionado={ciclo} caminho={`/mentoradas/${mentorada.id}/sessoes`} mesmoComUm />
      </div>

      <Bloco
        icone={Video}
        titulo="Sessões da mentoria"
        acao={<span className="text-xs whitespace-nowrap text-texto-suave">{ciclo}</span>}
      >
        {sessoes instanceof Error ? (
          <AvisoNotion erro={sessoes} detalhar={visitante.admin} />
        ) : (
          <ListaDeSessoes key={ciclo} mentoradaId={mentorada.id} sessoes={sessoes} />
        )}
      </Bloco>
    </div>
  );
}
