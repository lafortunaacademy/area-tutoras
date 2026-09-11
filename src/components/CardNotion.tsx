'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Loader2, X } from 'lucide-react';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from './BlocosNotion';

/**
 * Linha que abre o conteúdo num card centralizado.
 *
 * Antes o conteúdo se abria embutido, empurrando o resto da página para baixo —
 * e como cada item pode ter texto longo, a leitura acontecia espremida entre
 * outras seções. No card a atenção fica no que foi aberto, e fechar devolve a
 * página exatamente como estava.
 */
export function CardNotion({
  pageId,
  mentoradaId,
  titulo,
  meta,
  rodape,
}: {
  pageId: string;
  mentoradaId: string;
  titulo: string;
  meta?: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [blocos, setBlocos] = useState<BlocoSimples[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fechar = useCallback(() => setAberto(false), []);

  async function abrir() {
    setAberto(true);
    if (blocos || carregando) return;

    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/notion-content/${pageId}?mentorada=${encodeURIComponent(mentoradaId)}`,
      );
      if (!res.ok) throw new Error('falhou');
      const json = (await res.json()) as { blocos: BlocoSimples[] };
      setBlocos(json.blocos);
    } catch {
      setErro('Não consegui carregar o conteúdo agora.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <li className="rounded-xl border border-borda bg-superficie transition hover:border-marca">
        <button
          type="button"
          onClick={abrir}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        >
          <ChevronRight aria-hidden size={16} className="shrink-0 text-texto-suave" />
          <span className="min-w-0 flex-1 text-sm font-medium">{titulo}</span>
          {meta}
        </button>
      </li>

      {aberto ? (
        <Modal titulo={titulo} meta={meta} aoFechar={fechar}>
          {carregando ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Buscando no Notion…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">{erro}</p> : null}
          {blocos ? <BlocosNotion blocos={blocos} /> : null}
          {rodape}
        </Modal>
      ) : null}
    </>
  );
}

function Modal({
  titulo,
  meta,
  aoFechar,
  children,
}: {
  titulo: string;
  meta?: React.ReactNode;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Esc fecha, e a página atrás para de rolar enquanto o card está aberto.
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAntes;
    };
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]"
      />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="display text-lg leading-tight">{titulo}</p>
            {meta ? <div className="mt-1 text-xs text-texto-suave">{meta}</div> : null}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
