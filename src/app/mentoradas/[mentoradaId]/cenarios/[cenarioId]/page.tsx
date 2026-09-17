import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Target } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { lerCenario, type ColunaCenario } from '@/lib/notion/cenarios';

export const dynamic = 'force-dynamic';

/** Um cartão de cenário (atual × desejado) de um ano, lido ao vivo do Notion. */
export default async function CenarioPage({
  params,
}: {
  params: Promise<{ mentoradaId: string; cenarioId: string }>;
}) {
  await exigirAdmin();
  const { mentoradaId, cenarioId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const cenario = await lerCenario(mentorada.id, cenarioId);
  if (!cenario) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="display text-3xl sm:text-4xl">{cenario.cartao.titulo}</h1>
        {cenario.cartao.ano ? <span className="text-lg text-texto-suave tabular-nums">{cenario.cartao.ano}</span> : null}
      </div>
      <p className="mt-1 text-sm text-texto-suave">{mentorada.nome}</p>

      {cenario.colunas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-borda px-4 py-8 text-center text-sm text-texto-suave">
          Este cenário ainda está em branco.
        </p>
      ) : (
        <div className={`mt-8 grid gap-4 ${cenario.colunas.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          {cenario.colunas.map((c, i) => (
            <Coluna key={i} coluna={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Coluna({ coluna }: { coluna: ColunaCenario }) {
  return (
    <section className="rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-medium">
        <Target aria-hidden size={16} className="text-marca" />
        {coluna.titulo || 'Cenário'}
      </h2>

      {coluna.itens.length === 0 ? (
        <p className="mt-4 text-sm text-texto-suave">Ainda não preenchido.</p>
      ) : (
        <div className="mt-4 space-y-2 text-sm leading-relaxed">
          {coluna.itens.map((item, i) => {
            switch (item.tipo) {
              case 'secao':
                return (
                  <h3 key={i} className="optima border-b border-borda pt-3 pb-1 text-xs tracking-[0.14em] text-marca uppercase first:pt-0">
                    {item.texto}
                  </h3>
                );
              case 'destaque':
                return (
                  <p key={i} className="mt-3 w-fit rounded-md bg-marca-suave px-2 py-0.5 text-xs font-medium text-marca">
                    {item.texto}
                  </p>
                );
              case 'item':
                return (
                  <p key={i} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-texto-suave" />
                    <span className="whitespace-pre-line">{item.texto}</span>
                  </p>
                );
              default:
                return (
                  <p key={i} className="whitespace-pre-line">
                    {item.texto}
                  </p>
                );
            }
          })}
        </div>
      )}
    </section>
  );
}
