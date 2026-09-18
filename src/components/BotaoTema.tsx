'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Troca entre claro e escuro. Sem escolha, vale o do sistema; a escolha fica
 * guardada neste navegador (localStorage) e é aplicada antes de pintar a
 * página pelo script do layout, para não piscar.
 */
export const CHAVE_TEMA = 'tema';

type Tema = 'claro' | 'escuro';

function temaAtual(): Tema {
  const escolhido = document.documentElement.dataset.tema;
  if (escolhido === 'claro' || escolhido === 'escuro') return escolhido;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

const EVENTO = 'tema-trocado';

/** Avisa quando o tema muda: pelo botão ou pelo sistema (quando não há escolha). */
function ouvir(avisar: () => void) {
  const sistema = window.matchMedia('(prefers-color-scheme: dark)');
  sistema.addEventListener('change', avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    sistema.removeEventListener('change', avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

export function BotaoTema({ className = '' }: { className?: string }) {
  // No servidor não se sabe o tema: o botão não mostra rótulo errado até o navegador chegar.
  const tema = useSyncExternalStore<Tema | null>(ouvir, temaAtual, () => null);

  const trocar = () => {
    const novo: Tema = temaAtual() === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.tema = novo;
    try {
      localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // Navegador sem armazenamento: vale só nesta visita.
    }
    window.dispatchEvent(new Event(EVENTO));
  };

  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'}
      className={`inline-flex items-center gap-1.5 rounded-full border border-borda bg-superficie px-3 py-1.5 text-xs font-medium text-texto-suave transition hover:border-marca hover:text-texto ${className}`}
    >
      {tema === 'escuro' ? <Moon aria-hidden size={13} /> : <Sun aria-hidden size={13} />}
      {tema === null ? 'Tema' : tema === 'escuro' ? 'Escuro' : 'Claro'}
    </button>
  );
}
