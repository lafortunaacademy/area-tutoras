'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';

export type ItemMenu = { id: string; nome: string };

/**
 * Menu lateral com todas as mentoradas.
 *
 * São 44 nomes: sem um filtro, achar alguém vira rolagem e paciência. O filtro
 * é local — a lista inteira já veio do servidor, então não há ida e volta a
 * cada tecla.
 */
export function MenuMentoradas({ mentoradas }: { mentoradas: ItemMenu[] }) {
  const [busca, setBusca] = useState('');
  const caminho = usePathname();

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mentoradas;
    return mentoradas.filter((m) => m.nome.toLowerCase().includes(termo));
  }, [busca, mentoradas]);

  return (
    <nav aria-label="Mentoradas" className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search
          aria-hidden
          size={14}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-suave"
        />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={`Buscar entre ${mentoradas.length}`}
          aria-label="Buscar mentorada"
          className="w-full rounded-lg border border-borda bg-superficie py-2 pr-3 pl-8 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20"
        />
      </div>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
        {visiveis.map((m) => {
          const atual = caminho.startsWith(`/painel/${m.id}`);
          return (
            <li key={m.id}>
              <Link
                href={`/painel/${m.id}`}
                aria-current={atual ? 'page' : undefined}
                className={`block rounded-lg px-3 py-2 text-sm leading-snug transition ${
                  atual
                    ? 'bg-marca-suave font-medium text-marca'
                    : 'text-texto-suave hover:bg-superficie hover:text-texto'
                }`}
              >
                {m.nome}
              </Link>
            </li>
          );
        })}

        {visiveis.length === 0 ? (
          <li className="px-3 py-2 text-sm text-texto-suave">Ninguém com esse nome.</li>
        ) : null}
      </ul>
    </nav>
  );
}
