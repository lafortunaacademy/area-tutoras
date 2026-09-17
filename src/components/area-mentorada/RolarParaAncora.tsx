'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Leva até a seção do endereço (#tarefas, #lucro…) mesmo quando ela ainda não
 * existe na tela: as seções da página da mentorada chegam aos poucos do Notion,
 * então o navegador sozinho desistiria antes de a âncora aparecer.
 */
export function RolarParaAncora() {
  const caminho = usePathname();

  useEffect(() => {
    let tentativas = 0;
    let timer: ReturnType<typeof setTimeout>;

    const rolar = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const alvo = document.getElementById(id);
      if (alvo) {
        alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // Até ~15 s: o suficiente para a seção mais lenta chegar.
      if (tentativas++ < 60) timer = setTimeout(rolar, 250);
    };

    rolar();
    const aoMudarHash = () => {
      tentativas = 0;
      clearTimeout(timer);
      rolar();
    };
    window.addEventListener('hashchange', aoMudarHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hashchange', aoMudarHash);
    };
  }, [caminho]);

  return null;
}
