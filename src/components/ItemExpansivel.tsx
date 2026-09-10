'use client';

import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from './BlocosNotion';

/**
 * Card que só busca o conteúdo quando é aberto.
 *
 * A lista da mentorada pode ter dezenas de itens; carregar os blocos de todos
 * de uma vez seria dezenas de chamadas ao Notion para conteúdo que ninguém
 * pediu. Aqui o custo é pago item a item, e só uma vez por item.
 */
export function ItemExpansivel({
  pageId,
  mentoradaId,
  titulo,
  meta,
  children,
}: {
  pageId: string;
  mentoradaId: string;
  titulo: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [blocos, setBlocos] = useState<BlocoSimples[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);

    if (!vaiAbrir || blocos || carregando) return;

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
    <li className="rounded-xl border border-borda bg-superficie">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <ChevronRight
          aria-hidden
          size={16}
          className={`shrink-0 text-texto-suave transition-transform ${aberto ? 'rotate-90' : ''}`}
        />
        <span className="min-w-0 flex-1 text-sm font-medium">{titulo}</span>
        {meta}
        {carregando ? (
          <Loader2 aria-hidden size={14} className="shrink-0 animate-spin text-texto-suave" />
        ) : null}
      </button>

      {aberto ? (
        <div className="border-t border-borda px-4 py-4">
          {erro ? <p className="text-sm text-parado">{erro}</p> : null}
          {blocos ? <BlocosNotion blocos={blocos} /> : null}
          {!blocos && !erro && !carregando ? (
            <p className="text-sm text-texto-suave">Sem conteúdo.</p>
          ) : null}
          {children}
        </div>
      ) : null}
    </li>
  );
}
