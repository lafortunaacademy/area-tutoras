'use client';

import { useActionState } from 'react';
import { enviarMagicLink, type EstadoLogin } from './actions';

const inicial: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, acao, enviando] = useActionState(enviarMagicLink, inicial);

  if (estado.enviado) {
    return (
      <div className="rounded-xl border border-borda bg-superficie p-6 text-center shadow-[var(--sombra)]">
        <p className="text-sm font-medium">Link enviado</p>
        <p className="mt-2 text-sm text-texto-suave">
          Se esse e-mail estiver cadastrado como tutora, o link de acesso chegou na caixa de
          entrada. Ele vale por uma hora.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
          className="w-full rounded-lg border border-borda bg-superficie px-3.5 py-2.5 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20"
        />
      </div>

      {estado.erro ? (
        <p className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro}</p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-marca px-4 py-2.5 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? 'Enviando…' : 'Receber link de acesso'}
      </button>
    </form>
  );
}
