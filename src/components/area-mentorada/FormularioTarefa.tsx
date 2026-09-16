'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { adicionarTarefa, type EstadoTarefa } from '@/app/mentoradas/actions';

const CAMPO =
  'w-full rounded-lg border border-borda bg-superficie px-3 py-2.5 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20';

export function FormularioTarefa({ mentoradaId }: { mentoradaId: string }) {
  const [estado, acao] = useActionState<EstadoTarefa, FormData>(adicionarTarefa, {});

  return (
    <form action={acao} className="space-y-5 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
      <input type="hidden" name="mentoradaId" value={mentoradaId} />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Tarefa</span>
        <input name="tarefa" required maxLength={1900} autoFocus className={CAMPO} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Prazo</span>
        <input name="prazo" type="date" className={`${CAMPO} sm:max-w-56`} />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Observações</span>
        <textarea name="observacoes" rows={6} maxLength={10000} className={`${CAMPO} resize-y`} />
      </label>

      {estado.erro ? (
        <p role="alert" className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t border-borda pt-5">
        <Link
          href={`/mentoradas/${mentoradaId}#tarefas`}
          className="rounded-lg px-4 py-2 text-sm text-texto-suave transition hover:text-texto"
        >
          Cancelar
        </Link>
        <Salvar />
      </div>
    </form>
  );
}

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-marca px-5 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Salvando…' : 'Criar tarefa'}
    </button>
  );
}
