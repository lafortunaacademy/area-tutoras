import type { LucideIcon } from 'lucide-react';

/** Um cartão da área de membros: ícone, título e o conteúdo. */
export function Bloco({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className = '',
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`min-w-0 rounded-2xl border border-borda bg-superficie p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Icone aria-hidden size={15} className="shrink-0 text-marca" />
            {titulo}
          </h3>
          {descricao ? <p className="mt-1 text-sm text-texto-suave">{descricao}</p> : null}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Um grupo de blocos sob um título da marca ("Faturamento", "Lucro"…). */
export function Grupo({ titulo, id, children }: { titulo: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h3 className="display mb-4 text-xl text-marca">{titulo}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Aviso sobre o fundo de um gráfico ou lista ainda sem dados. */
export function SemDados({ children = 'Sem dados ainda' }: { children?: React.ReactNode }) {
  return (
    <span className="rounded-full border border-borda bg-superficie px-3 py-1 text-xs text-texto-suave">
      {children}
    </span>
  );
}
