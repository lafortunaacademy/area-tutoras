'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { TutoraDoHub } from '@/lib/notion/hub';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { iniciais } from '@/lib/iniciais';

/** Conteúdo de cada tutora, buscado uma vez por página aberta e já no passar do mouse. */
const buscas = new Map<string, Promise<BlocoSimples[]>>();
function buscarTutora(id: string): Promise<BlocoSimples[]> {
  let busca = buscas.get(id);
  if (!busca) {
    busca = fetch(`/api/tutoras/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falhou'))))
      .then((j: { blocos: BlocoSimples[] }) => j.blocos);
    busca.catch(() => buscas.delete(id));
    buscas.set(id, busca);
  }
  return busca;
}

/**
 * A galeria "Tutorias do HUB", só para ver: as tutoras agrupadas por área
 * (Áreas/Especialidades), como o quadro "por área" do Notion. Cada cartão abre
 * por cima da página.
 */
export function GaleriaTutoras({ tutoras }: { tutoras: TutoraDoHub[] }) {
  const [aberta, setAberta] = useState<TutoraDoHub | null>(null);

  if (tutoras.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhuma tutora ativa no momento.</p>;
  }

  const eventos = (t: TutoraDoHub) => ({
    onClick: () => setAberta(t),
    onMouseEnter: () => void buscarTutora(t.id).catch(() => {}),
    onFocus: () => void buscarTutora(t.id).catch(() => {}),
  });

  return (
    <>
      <PorArea tutoras={tutoras} eventos={eventos} />

      {aberta ? <Cartao tutora={aberta} aoFechar={() => setAberta(null)} /> : null}
    </>
  );
}

/**
 * Colunas por área, como o quadro "por área" do Notion. Quem tem duas
 * especialidades aparece nas duas colunas; quem não tem nenhuma vai para
 * "Sem área", no fim.
 */
function PorArea({
  tutoras,
  eventos,
}: {
  tutoras: TutoraDoHub[];
  eventos: (t: TutoraDoHub) => React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const grupos = new Map<string, TutoraDoHub[]>();
  for (const t of tutoras) {
    for (const area of t.especialidades.length ? t.especialidades : ['Sem área']) {
      grupos.set(area, [...(grupos.get(area) ?? []), t]);
    }
  }
  const areas = [...grupos.keys()].sort((a, b) =>
    a === 'Sem área' ? 1 : b === 'Sem área' ? -1 : a.localeCompare(b, 'pt-BR'),
  );

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex items-start gap-3">
        {areas.map((area) => (
          <section key={area} className="w-40 shrink-0 rounded-xl bg-fundo p-1.5">
            <h4 className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] leading-tight">
              <span className="rounded bg-superficie-2 px-1.5 py-0.5 font-medium">{area}</span>
              <span className="text-texto-suave tabular-nums">{grupos.get(area)!.length}</span>
            </h4>
            <ul className="space-y-1.5">
              {grupos.get(area)!.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    {...eventos(t)}
                    className="flex w-full flex-col overflow-hidden rounded-lg border border-borda bg-superficie text-left transition hover:border-marca hover:shadow-[var(--sombra)]"
                  >
                    <Foto tutora={t} className="h-24 w-full" />
                    <div className="flex min-w-0 flex-col gap-1 p-1.5">
                      <p className="text-[11.5px] font-medium leading-tight">{t.nome}</p>
                      {t.legendaEntregaveis ? <p className="text-[10px] font-medium text-destaque">{t.legendaEntregaveis}</p> : null}
                      <Etiquetas itens={t.topicos} suave />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Foto({ tutora, className }: { tutora: TutoraDoHub; className: string }) {
  return tutora.foto ? (
    // Retratos: o rosto costuma estar um pouco acima do meio da foto, então o
    // recorte mira ali — nem no topo (corta o queixo) nem no centro (corta a testa).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={tutora.foto} alt="" className={`${className} object-cover object-[center_40%]`} />
  ) : (
    <span aria-hidden className={`${className} display flex items-center justify-center bg-marca-suave text-3xl text-marca`}>
      {iniciais(tutora.nome)}
    </span>
  );
}

function Etiquetas({ itens, suave }: { itens: string[]; suave?: boolean }) {
  if (itens.length === 0) return null;
  return (
    <ul className="flex min-w-0 flex-wrap gap-1">
      {itens.map((i) => (
        <li
          key={i}
          title={i}
          className={`max-w-full truncate rounded px-1 py-px text-[9.5px] ${suave ? 'bg-superficie-2 text-texto-suave' : 'bg-marca-suave text-marca'}`}
        >
          {i}
        </li>
      ))}
    </ul>
  );
}

function Cartao({ tutora, aoFechar }: { tutora: TutoraDoHub; aoFechar: () => void }) {
  const [blocos, setBlocos] = useState<BlocoSimples[] | null>(null);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    buscarTutora(tutora.id)
      .then((b) => vivo && setBlocos(b))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [tutora.id]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus();
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  return (
    <div role="dialog" aria-modal="true" aria-label={tutora.nome} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]"
      />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <Foto tutora={tutora} className="size-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="display text-xl leading-tight">{tutora.nome}</p>
            <Etiquetas itens={tutora.especialidades} />
            {tutora.legendaEntregaveis ? <p className="text-xs text-texto-suave">{tutora.legendaEntregaveis}</p> : null}
            <Etiquetas itens={tutora.topicos} suave />
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <X aria-hidden size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!blocos && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
          {blocos ? <BlocosNotion blocos={blocos} /> : null}
        </div>
      </div>
    </div>
  );
}
