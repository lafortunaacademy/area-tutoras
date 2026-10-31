'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, Users } from 'lucide-react';
import { iniciais } from '@/lib/iniciais';

/**
 * A lista de mentoradas no celular.
 *
 * No computador ela mora na barra marrom, que abaixo de `lg` não cabe. Antes
 * disso existir, o celular dependia de uma página só para a lista; agora ela
 * abre aqui mesmo, sem sair de onde a pessoa está.
 *
 * Fecha ao escolher alguém: no telefone, um painel aberto por cima do conteúdo
 * é o que mais atrapalha.
 */
export function MentoradasNoCelular({
  mentoradas,
  base,
}: {
  mentoradas: { id: string; nome: string; foto: string | null }[];
  /** Onde moram as páginas de mentorada ("/painel", "/mentoradas"). */
  base: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mentoradas;
    return mentoradas.filter((m) => m.nome.toLowerCase().includes(termo));
  }, [busca, mentoradas]);

  if (mentoradas.length === 0) return null;

  return (
    <div className="border-b border-borda bg-superficie lg:hidden">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm sm:px-6"
      >
        <Users aria-hidden size={16} className="shrink-0 text-marca" />
        <span className="font-medium">Mentoradas</span>
        <span className="text-texto-suave">{mentoradas.length}</span>
        <ChevronDown
          aria-hidden
          size={16}
          className={`ml-auto shrink-0 text-texto-suave transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto ? (
        <div className="px-4 pb-3 sm:px-6">
          <label className="relative block">
            <Search
              aria-hidden
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-suave"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar mentorada"
              aria-label="Buscar mentorada"
              className="w-full rounded-lg border border-borda bg-superficie-2 py-2 pr-3 pl-8 text-sm outline-none placeholder:text-texto-suave focus:border-marca"
            />
          </label>

          <ul className="mt-2 max-h-[55vh] space-y-0.5 overflow-y-auto">
            {visiveis.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${base}/${m.id}`}
                  onClick={() => setAberto(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition hover:bg-superficie-2"
                >
                  {m.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.foto} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[11px] font-medium text-marca"
                    >
                      {iniciais(m.nome)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{m.nome}</span>
                </Link>
              </li>
            ))}

            {visiveis.length === 0 ? (
              <li className="px-2 py-3 text-sm text-texto-suave">Ninguém com esse nome.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
