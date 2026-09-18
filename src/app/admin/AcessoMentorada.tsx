'use client';

import { useActionState } from 'react';
import { Plus, X } from 'lucide-react';
import { liberarAcesso, removerAcesso, type EstadoAcesso } from './actions';

const inicial: EstadoAcesso = {};

/** Os e-mails com que uma mentorada entra no app, e o campo para liberar mais um. */
export function AcessoMentorada({
  mentoradaId,
  nome,
  emails,
}: {
  mentoradaId: string;
  nome: string;
  emails: { id: string; email: string }[];
}) {
  const [estado, acao, enviando] = useActionState(liberarAcesso, inicial);

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{nome}</p>
          {emails.length ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {emails.map((e) => (
                <li key={e.id} className="inline-flex items-center gap-1 rounded-full bg-superficie-2 py-0.5 pr-1 pl-2.5 text-xs">
                  {e.email}
                  <form action={removerAcesso}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" aria-label={`Tirar o acesso de ${e.email}`} className="rounded-full p-0.5 text-texto-suave hover:text-parado">
                      <X aria-hidden size={12} />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-texto-suave">Ainda sem acesso ao app.</p>
          )}
        </div>

        <form action={acao} className="flex w-full max-w-sm items-center gap-2 sm:w-auto">
          <input type="hidden" name="mentoradaId" value={mentoradaId} />
          <input
            name="email"
            type="email"
            required
            placeholder="e-mail dela"
            aria-label={`E-mail de acesso de ${nome}`}
            className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-1.5 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20 sm:w-56"
          />
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-borda px-3 py-1.5 text-xs font-medium transition hover:border-marca hover:text-marca disabled:opacity-50"
          >
            <Plus aria-hidden size={13} />
            Liberar
          </button>
        </form>
      </div>
      {estado.erro ? <p className="mt-2 text-xs text-parado">{estado.erro}</p> : null}
      {estado.ok ? <p className="mt-2 text-xs text-ok">{estado.ok}</p> : null}
    </li>
  );
}
