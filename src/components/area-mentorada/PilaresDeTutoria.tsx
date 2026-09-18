import { ChevronRight } from 'lucide-react';
import type { ParteDaTutoria, Pilar } from '@/lib/notion/pilares';
import { Icone } from './IconeNotion';
import { MateriaisDaTutoria } from './MateriaisDaTutoria';
import { SessoesDaTutoria } from './SessoesDaTutoria';

/**
 * Os pilares da página Tutorias, como no Notion: título, frase e um toggle por
 * tutoria, com os materiais e as sessões dela.
 */
export function PilaresDeTutoria({ pilares, mentoradaId }: { pilares: Pilar[]; mentoradaId: string }) {
  // As sessões de cada tutoria não entram aqui: elas já aparecem na página Sessões.
  pilares = pilares.map((p) => ({
    ...p,
    tutorias: p.tutorias.map((t) => ({ ...t, partes: t.partes.filter((parte) => parte.tipo !== 'sessoes') })),
  }));

  return (
    <div className="space-y-4">
      {pilares.map((p) => (
        <section key={p.id} className="min-w-0 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <Icone icone={p.icone} tamanho={16} />
            {p.titulo}
          </h3>

          {p.frase.length ? (
            <p className="mt-3 border-l-2 border-marca pl-3 text-sm leading-relaxed text-destaque italic">
              {p.frase.map((t, i) => (t.negrito ? <strong key={i} className="font-semibold">{t.texto}</strong> : <span key={i}>{t.texto}</span>))}
            </p>
          ) : null}

          {p.tutorias.length ? (
            <div className="mt-4 space-y-3">
              {p.tutorias.map((t) => (
                <details key={t.id} open className="group rounded-xl bg-marca-suave/60">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <ChevronRight aria-hidden size={15} className="shrink-0 text-texto-suave transition-transform group-open:rotate-90" />
                    <Icone icone={t.icone} tamanho={15} />
                    {t.titulo}
                  </summary>
                  <div className="space-y-3 px-4 pb-4">
                    {t.partes.length ? (
                      t.partes.map((parte) => <Parte key={parte.id} parte={parte} mentoradaId={mentoradaId} />)
                    ) : (
                      <p className="text-sm text-texto-suave">Nada preenchido nesta tutoria ainda.</p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-texto-suave">Nenhuma tutoria neste pilar ainda.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function Parte({ parte, mentoradaId }: { parte: ParteDaTutoria; mentoradaId: string }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Icone icone={parte.icone} tamanho={16} />
        {parte.titulo}
      </h4>

      {parte.tipo === 'sessoes' ? (
        <SessoesDaTutoria mentoradaId={mentoradaId} sessoes={parte.sessoes} />
      ) : (
        <MateriaisDaTutoria mentoradaId={mentoradaId} itens={parte.itens} />
      )}
    </div>
  );
}
