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

/** A galeria "Tutorias do HUB", só para ver; cada cartão abre por cima da página. */
export function GaleriaTutoras({ tutoras }: { tutoras: TutoraDoHub[] }) {
  const [aberta, setAberta] = useState<TutoraDoHub | null>(null);

  if (tutoras.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhuma tutora ativa no momento.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tutoras.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setAberta(t)}
              onMouseEnter={() => void buscarTutora(t.id).catch(() => {})}
              onFocus={() => void buscarTutora(t.id).catch(() => {})}
              className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-borda bg-superficie text-left transition hover:border-marca hover:shadow-[var(--sombra)]"
            >
              <Foto tutora={t} className="h-32 w-full" />
              <div className="flex flex-1 flex-col gap-1.5 p-2.5">
                <p className="text-[13px] font-medium leading-tight">{t.nome}</p>
                <Etiquetas itens={t.especialidades} />
                {t.legendaEntregaveis ? <p className="text-[11px] text-texto-suave">{t.legendaEntregaveis}</p> : null}
                <Etiquetas itens={t.topicos} suave />
              </div>
            </button>
          </li>
        ))}
      </ul>

      {aberta ? <Cartao tutora={aberta} aoFechar={() => setAberta(null)} /> : null}
    </>
  );
}

function Foto({ tutora, className }: { tutora: TutoraDoHub; className: string }) {
  return tutora.foto ? (
    // Fotos de retrato: o recorte parte do alto, para o rosto não ser cortado.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={tutora.foto} alt="" className={`${className} object-cover object-[center_15%]`} />
  ) : (
    <span aria-hidden className={`${className} display flex items-center justify-center bg-marca-suave text-3xl text-marca`}>
      {iniciais(tutora.nome)}
    </span>
  );
}

function Etiquetas({ itens, suave }: { itens: string[]; suave?: boolean }) {
  if (itens.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {itens.map((i) => (
        <li
          key={i}
          className={`rounded px-1.5 py-px text-[10px] ${suave ? 'bg-superficie-2 text-texto-suave' : 'bg-marca-suave text-marca'}`}
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
