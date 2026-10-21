'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SecaoMenu } from '@/components/MenuMentoradas';
import { rolarAte } from '@/lib/ancora';

/**
 * Os mesmos atalhos do menu lateral, numa faixa que rola para o lado.
 *
 * No celular o menu some (ele comeria a tela toda), e sem isso a mentorada
 * ficava sem caminho para as outras partes da área dela.
 */
export function AtalhosNoCelular({ base, secoes }: { base: string; secoes: SecaoMenu[] }) {
  const caminho = usePathname();
  useAncoraDaPagina();

  // Só dentro da área de uma mentorada: é lá que estas seções existem.
  const dentro = caminho.startsWith(`${base}/`);
  if (!dentro) return null;

  const raiz = `${base}/${caminho.slice(base.length + 1).split('/')[0]}`;
  const itens = secoes.flatMap((s) => [s, ...(s.filhos ?? [])]);

  return (
    <nav
      aria-label="Atalhos da área"
      className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
    >
      {itens.map((s) => {
        const href = `${raiz}${s.rota ? `/${s.rota}` : ''}${s.ancora ? `#${s.ancora}` : ''}`;
        const aqui = s.rota ? caminho.startsWith(`${raiz}/${s.rota}`) : caminho === raiz;

        return (
          <Link
            key={s.rotulo}
            href={href}
            // Seção da própria página: rola até ela em vez de navegar.
            onClick={(e) => {
              if (!s.rota && s.ancora && caminho === raiz && rolarAte(s.ancora)) e.preventDefault();
            }}
            aria-current={aqui && s.rota ? 'page' : undefined}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap transition ${
              aqui && s.rota
                ? 'border-marca bg-marca font-medium text-marca-contraste'
                : 'border-borda bg-superficie text-texto-suave'
            }`}
          >
            {s.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Chegou com `#sessoes` no endereço: espera a seção aparecer e rola até lá.
 *
 * As seções chegam depois do primeiro desenho (cada uma busca o Notion), e o
 * navegador procura a âncora antes disso — sem esta espera a página abria no
 * topo e parecia que o atalho não tinha funcionado.
 */
function useAncoraDaPagina() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let tentativas = 0;
    const relogio = setInterval(() => {
      // Seis segundos de espera; se a pessoa já rolou, não insiste.
      if (rolarAte(id) || ++tentativas > 20 || window.scrollY > 40) clearInterval(relogio);
    }, 300);
    return () => clearInterval(relogio);
  }, []);
}
