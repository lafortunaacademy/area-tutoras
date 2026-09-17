import Link from 'next/link';

/**
 * Os atalhos da área da mentorada, no visual dos cartões do Notion: o da marca
 * claro, os de rotina escuros.
 *
 * As cores são fixas, não do tema: são a capa de cada seção, e no escuro
 * precisam continuar parecendo a marca. Cada cartão vira link quando a seção
 * dele existe (`rota`).
 */
const CARTOES: { titulo: string; tom: 'claro' | 'escuro'; rota?: string }[] = [
  { titulo: 'La Fortuna', tom: 'claro' },
  { titulo: 'Sessões', tom: 'escuro' },
  { titulo: 'Tutorias', tom: 'escuro' },
  { titulo: 'Gestão de resultados', tom: 'escuro', rota: 'gestao-de-resultados' },
];

export function CartoesDaArea({ mentoradaId }: { mentoradaId: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARTOES.map((c) => {
        const classes = `relative flex h-20 items-center justify-center rounded-xl px-3 text-center sm:h-24 ${
          c.tom === 'claro'
            ? 'border border-[#d8cfc0] bg-[#ede8dc] text-[#4b3424]'
            : 'bg-[#4b3424] text-[#f5f2e9]'
        }`;
        const titulo = (
          <span className="optima text-xs leading-tight tracking-[0.12em] uppercase sm:text-sm">
            {c.titulo}
          </span>
        );

        return (
          <li key={c.titulo}>
            {c.rota ? (
              <Link
                href={`/mentoradas/${mentoradaId}/${c.rota}`}
                className={`${classes} transition hover:shadow-[var(--sombra)] hover:brightness-110`}
              >
                {titulo}
              </Link>
            ) : (
              <div aria-disabled className={classes}>
                {titulo}
                {/* Em tela estreita o selo cai em cima do título; lá ele sai. */}
                <span className="absolute right-2 bottom-1 hidden text-[8px] tracking-wide uppercase opacity-60 sm:block">
                  em breve
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
