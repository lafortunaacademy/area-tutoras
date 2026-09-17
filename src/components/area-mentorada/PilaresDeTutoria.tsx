import type { IconeNotion, Pilar } from '@/lib/notion/pilares';

/** Os pilares da página Tutorias, como no Notion: título, frase e os cartões de cada um. */
export function PilaresDeTutoria({ pilares }: { pilares: Pilar[] }) {
  return (
    <div className="space-y-4">
      {pilares.map((p) => (
        <section key={p.id} className="min-w-0 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Icone icone={p.icone} tamanho={16} />
            {p.titulo}
          </h3>

          {p.frase.length ? (
            <p className="mt-3 border-l-2 border-marca pl-3 text-sm leading-relaxed text-destaque italic">
              {p.frase.map((t, i) => (t.negrito ? <strong key={i} className="font-semibold">{t.texto}</strong> : <span key={i}>{t.texto}</span>))}
            </p>
          ) : null}

          {p.cartoes.length ? (
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {p.cartoes.map((c) => (
                <li
                  key={c.id}
                  className="flex min-h-14 items-center gap-2.5 rounded-xl border border-borda bg-superficie px-3 py-2.5 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <Icone icone={c.icone} tamanho={16} />
                  <span className="leading-snug">{c.titulo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-texto-suave">Nenhuma tutoria neste pilar ainda.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function Icone({ icone, tamanho }: { icone: IconeNotion; tamanho: number }) {
  if (!icone) return null;
  if (icone.tipo === 'emoji') {
    return (
      <span aria-hidden className="shrink-0 leading-none" style={{ fontSize: tamanho }}>
        {icone.emoji}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icone.url} alt="" width={tamanho} height={tamanho} className="shrink-0" />;
}
