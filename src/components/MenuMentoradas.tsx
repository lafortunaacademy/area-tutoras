'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Home, Search, Users } from 'lucide-react';

export type ItemMenu = { id: string; nome: string; foto: string | null };

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

  // Numa página de mentorada a lista começa aberta; no Início, fechada — a
  // pessoa está ali para ver o resumo dela, não para escolher alguém.
  const naMentorada = /^\/painel\/[^/]+$/.test(caminho) && caminho !== '/painel/inicio';
  const [aberto, setAberto] = useState(naMentorada);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mentoradas;
    return mentoradas.filter((m) => m.nome.toLowerCase().includes(termo));
  }, [busca, mentoradas]);

  const noInicio = caminho === '/painel/inicio';

  return (
    <nav aria-label="Navegação" className="flex h-full flex-col">
      <Link
        href="/painel/inicio"
        aria-current={noInicio ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
          noInicio
            ? 'bg-marca font-medium text-marca-contraste shadow-[var(--sombra)]'
            : 'text-texto-suave hover:bg-superficie hover:text-texto'
        }`}
      >
        <Home aria-hidden size={15} className="shrink-0" />
        Início
      </Link>

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className={`mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
          aberto || naMentorada
            ? 'text-texto'
            : 'text-texto-suave hover:bg-superficie hover:text-texto'
        }`}
      >
        <Users aria-hidden size={15} className="shrink-0" />
        <span className="flex-1 text-left">Mentoradas</span>
        <ChevronDown
          aria-hidden
          size={14}
          className={`shrink-0 text-texto-suave transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="relative mb-2">
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
                    className={`flex items-center gap-2.5 rounded-lg py-1.5 pr-3 pl-2 text-sm leading-snug transition ${
                      atual
                        ? 'bg-marca font-medium text-marca-contraste shadow-[var(--sombra)]'
                        : 'text-texto-suave hover:bg-superficie hover:text-texto'
                    }`}
                  >
                    <Retrato nome={m.nome} foto={m.foto} />
                    <span className="min-w-0 flex-1">{m.nome}</span>
                  </Link>
                </li>
              );
            })}

            {visiveis.length === 0 ? (
              <li className="px-3 py-2 text-sm text-texto-suave">Ninguém com esse nome.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

/** Foto pequena ao lado do nome; sem foto, as iniciais seguram o alinhamento. */
function Retrato({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} alt="" className="size-6 shrink-0 rounded-full object-cover" />
    );
  }

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[9px] font-medium text-marca"
    >
      {iniciais}
    </span>
  );
}
