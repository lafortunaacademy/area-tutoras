'use client';

import { useState } from 'react';
import type { SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import { ListaDeSessoes } from './ListaDeSessoes';

/**
 * As sessões do ciclo separadas como no Notion: as da Fernanda de um lado, as
 * das tutoras do outro. A divisão é por quem conduz, não pelo tipo da sessão.
 */
export function SessoesEmAbas({
  mentoradaId,
  sessoes,
  dona,
}: {
  mentoradaId: string;
  sessoes: SessaoDaLista[];
  /** Nome de quem conduz as sessões da mentoria (a primeira aba). */
  dona: string;
}) {
  // Tutoria é a sessão que tem alguma tutora que não é a dona da mentoria. O
  // resto (sem tutora nenhuma, ou só com ela) é sessão com ela — assim a
  // divisão continua certa mesmo quando ela também aparece na coluna Tutora.
  const dela = (t: string) => t.toLowerCase().includes(dona.toLowerCase());
  const dasTutoras = sessoes.filter((s) => s.tutoras.some((t) => !dela(t)));
  const daDona = sessoes.filter((s) => !dasTutoras.includes(s));

  const ABAS = [
    { chave: 'dona' as const, rotulo: `Com a ${dona}`, lista: daDona },
    { chave: 'tutoras' as const, rotulo: 'Tutorias', lista: dasTutoras },
  ];

  const [aba, setAba] = useState<'dona' | 'tutoras'>('dona');
  const atual = ABAS.find((a) => a.chave === aba)!;

  return (
    <div>
      <div role="tablist" aria-label="Separar sessões" className="mb-3 flex flex-wrap gap-1">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={a.chave === aba}
            onClick={() => setAba(a.chave)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              a.chave === aba ? 'bg-marca font-medium text-marca-contraste' : 'text-texto-suave hover:bg-fundo hover:text-texto'
            }`}
          >
            {a.rotulo}
            <span className="ml-1.5 tabular-nums opacity-70">{a.lista.length}</span>
          </button>
        ))}
      </div>

      <ListaDeSessoes key={aba} mentoradaId={mentoradaId} sessoes={atual.lista} />
    </div>
  );
}
