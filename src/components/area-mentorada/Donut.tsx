/** Uma rosca: quanto de `total` já é `valor`. */
export function Donut({
  rotulo,
  valor,
  total,
  tom,
}: {
  rotulo: string;
  valor: number;
  total: number;
  tom: 'marca' | 'destaque';
}) {
  const raio = 52;
  const volta = 2 * Math.PI * raio;
  const fracao = total > 0 ? valor / total : 0;
  const cor = tom === 'marca' ? 'var(--marca)' : 'var(--destaque)';

  return (
    <figure className="flex flex-col items-center gap-3">
      <figcaption className="inline-flex items-center gap-1.5 rounded-full bg-fundo px-3 py-1 text-xs text-texto-suave">
        <span aria-hidden className="size-2 rounded-full" style={{ background: cor }} />
        {rotulo}
      </figcaption>

      <div className="relative size-40">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
          <circle cx="64" cy="64" r={raio} fill="none" stroke="var(--superficie-2)" strokeWidth="12" />
          {fracao > 0 ? (
            <circle
              cx="64"
              cy="64"
              r={raio}
              fill="none"
              stroke={cor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${fracao * volta} ${volta}`}
            />
          ) : null}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {total > 0 ? (
            <>
              <span className="display text-4xl leading-none">{valor}</span>
              <span className="mt-1 text-xs text-texto-suave">
                de {total} {total === 1 ? 'sessão' : 'sessões'}
              </span>
            </>
          ) : (
            <span className="text-xs text-texto-suave">Sem dados</span>
          )}
        </div>
      </div>
    </figure>
  );
}
