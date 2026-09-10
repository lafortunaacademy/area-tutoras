'use client';

import { useActionState } from 'react';
import { salvarHandsoff, type EstadoHandsoff } from '../actions';

const inicial: EstadoHandsoff = {};

export function FormularioHandsoff({ mentoradaId }: { mentoradaId: string }) {
  const [estado, acao, salvando] = useActionState(salvarHandsoff, inicial);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="mentoradaId" value={mentoradaId} />

      <Campo rotulo="Data da sessão" htmlFor="dataSessao">
        <input
          id="dataSessao"
          name="dataSessao"
          type="date"
          defaultValue={hoje}
          required
          className={ENTRADA}
        />
      </Campo>

      <Campo rotulo="Principal tema trabalhado" ajuda="uma frase" htmlFor="tema">
        <input id="tema" name="tema" type="text" required className={ENTRADA} />
      </Campo>

      <Campo rotulo="Resumo do que foi feito" ajuda="uma linha por bullet, 3 a 5" htmlFor="resumo">
        <textarea id="resumo" name="resumo" rows={5} className={ENTRADA} />
      </Campo>

      <Campo
        rotulo="Estado emocional da cliente ao sair"
        ajuda="observação de negócio"
        htmlFor="emocional"
      >
        <textarea id="emocional" name="emocional" rows={3} className={ENTRADA} />
      </Campo>

      <Campo rotulo="Exercícios ou tarefas deixadas" ajuda="uma linha por item" htmlFor="tarefas">
        <textarea id="tarefas" name="tarefas" rows={4} className={ENTRADA} />
      </Campo>

      {estado.erro ? (
        <p className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro}</p>
      ) : null}

      <button
        type="submit"
        disabled={salvando}
        className="rounded-lg bg-marca px-5 py-2.5 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
      >
        {salvando ? 'Salvando no Notion…' : 'Salvar hands-off'}
      </button>
    </form>
  );
}

const ENTRADA =
  'w-full rounded-lg border border-borda bg-superficie px-3.5 py-2.5 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20';

function Campo({
  rotulo,
  ajuda,
  htmlFor,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {rotulo}
        {ajuda ? <span className="ml-2 font-normal text-texto-suave">({ajuda})</span> : null}
      </label>
      {children}
    </div>
  );
}
