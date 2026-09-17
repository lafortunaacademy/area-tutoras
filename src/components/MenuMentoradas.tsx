'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Home, Search, Users } from 'lucide-react';
import { iniciais } from '@/lib/iniciais';

export type ItemMenu = { id: string; nome: string; foto: string | null };

/**
 * Atalho para uma parte da página da mentorada. `ancora` é o id da seção na
 * página; `rota` leva a uma subpágina (ex.: "gestao-de-resultados").
 */
export type SecaoMenu = { rotulo: string; ancora?: string; rota?: string };

/**
 * Menu lateral com todas as mentoradas.
 *
 * São 44 nomes: sem um filtro, achar alguém vira rolagem e paciência. O filtro
 * é local — a lista inteira já veio do servidor, então não há ida e volta a
 * cada tecla.
 *
 * Serve às duas áreas: `base` é onde moram as páginas de mentorada ("/painel"
 * nas tutoras, "/mentoradas" na área de membros) e `inicio` é o primeiro item.
 */
export function MenuMentoradas({
  mentoradas,
  base,
  inicio,
  secoes = [],
}: {
  mentoradas: ItemMenu[];
  base: string;
  inicio: { href: string; rotulo: string };
  /** Mostradas embaixo da mentorada aberta. */
  secoes?: SecaoMenu[];
}) {
  const [busca, setBusca] = useState('');
  const caminho = usePathname();

  const noInicio = caminho === inicio.href;
  // Numa página de mentorada a lista começa aberta; no início, fechada — a
  // pessoa está ali para ver o resumo, não para escolher alguém.
  const naMentorada = !noInicio && caminho.startsWith(`${base}/`);
  const [aberto, setAberto] = useState(naMentorada);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mentoradas;
    return mentoradas.filter((m) => m.nome.toLowerCase().includes(termo));
  }, [busca, mentoradas]);

  return (
    <nav aria-label="Navegação" className="flex h-full flex-col">
      <Link
        href={inicio.href}
        aria-current={noInicio ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
          noInicio
            ? 'bg-marca font-medium text-marca-contraste shadow-[var(--sombra)]'
            : 'text-texto-suave hover:bg-superficie hover:text-texto'
        }`}
      >
        <Home aria-hidden size={15} className="shrink-0" />
        {inicio.rotulo}
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
              const atual = caminho.startsWith(`${base}/${m.id}`);
              return (
                <li key={m.id}>
                  <Link
                    href={`${base}/${m.id}`}
                    aria-current={atual ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg py-1.5 pr-3 pl-2 text-[12.5px] leading-snug transition ${
                      atual
                        ? 'bg-marca font-medium text-marca-contraste shadow-[var(--sombra)]'
                        : 'text-texto-suave hover:bg-superficie hover:text-texto'
                    }`}
                  >
                    <Retrato nome={m.nome} foto={m.foto} />
                    <span className="min-w-0 flex-1">{m.nome}</span>
                  </Link>

                  {atual && secoes.length > 0 ? (
                    <ul className="mt-1 mb-2 ml-4 space-y-px border-l border-borda pl-2">
                      {secoes.map((s) => {
                        const href = `${base}/${m.id}${s.rota ? `/${s.rota}` : ''}${s.ancora ? `#${s.ancora}` : ''}`;
                        const naRota = s.rota ? caminho.startsWith(`${base}/${m.id}/${s.rota}`) : false;
                        return (
                          <li key={s.rotulo}>
                            <Link
                              href={href}
                              aria-current={naRota ? 'page' : undefined}
                              className={`block rounded-md px-2 py-1 text-[12px] leading-snug transition ${
                                naRota
                                  ? 'font-medium text-marca'
                                  : s.rota
                                    ? // Atalhos que abrem outra página ficam num marrom mais claro que as seções.
                                      'text-destaque hover:bg-superficie hover:text-marca'
                                    : 'text-texto-suave hover:bg-superficie hover:text-texto'
                              }`}
                            >
                              {s.rotulo}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
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
      <img src={foto} alt="" className="size-5 shrink-0 rounded-full object-cover" />
    );
  }

  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[8px] font-medium text-marca"
    >
      {iniciais(nome)}
    </span>
  );
}
