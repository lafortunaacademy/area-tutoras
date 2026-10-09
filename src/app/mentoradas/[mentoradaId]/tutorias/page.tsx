import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { pilaresDaMentorada } from '@/lib/notion/pilares';
import { ciclosDoControle, ordenarAnos, sessoesDosPilares, sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import { cicloAtual } from '@/lib/notion/config';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';
import { PilaresDeTutoria } from '@/components/area-mentorada/PilaresDeTutoria';

export const dynamic = 'force-dynamic';

/**
 * Página do cartão "Tutorias": os pilares lidos da página Tutorias desta
 * mentorada no Notion. O que ela responde é gravado lá. O HUB de tutoras tem
 * página própria.
 */
export default async function TutoriasPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { mentoradaId } = await params;
  const { ano: anoPedido } = await searchParams;
  const visitante = await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const [pilares, dasSessoes, ciclos] = await Promise.all([
    pilaresDaMentorada(mentorada).catch(() => null),
    sessoesPorCiclo(mentorada).catch(() => null),
    ciclosDoControle().catch(() => [] as string[]),
  ]);

  // Ciclo mostrado nas tabelas de sessões de cada pilar.
  const anoAtual = cicloAtual().match(/\d{4}/)![0];
  const anos = ordenarAnos([...new Set([...ciclos, ...(dasSessoes?.anos ?? [])])]);
  const ano = anoPedido && anos.includes(anoPedido) ? anoPedido : anos.includes(anoAtual) ? anoAtual : (anos[0] ?? anoAtual);

  // As sessões de cada pilar vêm do controle, não da página de tutorias.
  const sessoes = pilares
    ? await sessoesDosPilares(
        mentorada,
        pilares.map((p) => ({ id: p.id, tutorias: p.tutorias.map((t) => ({ nome: t.titulo })) })),
        ano,
      ).catch(() => null)
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">Tutorias</h1>
      <p className="mt-1 mb-6 text-sm text-texto-suave">{mentorada.nome}</p>

      <div className="mb-6">
        <SeletorDeAno
          anos={anos}
          selecionado={ano}
          caminho={`/mentoradas/${mentorada.id}/tutorias`}
          rotulo={(a) => `Ciclo ${a}`}
          mesmoComUm
        />
      </div>

      <div className="mt-4">
        {pilares === null ? (
          <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
            Não foi possível carregar as tutorias agora.
          </p>
        ) : pilares.length ? (
          <PilaresDeTutoria key={ano} pilares={pilares} mentoradaId={mentorada.id} admin={visitante.admin} sessoes={sessoes} ciclo={ano} />
        ) : null}
      </div>
    </div>
  );
}
