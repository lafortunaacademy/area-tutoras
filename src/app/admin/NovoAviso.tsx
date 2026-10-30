'use client';

import { useActionState } from 'react';
import { enviarAviso, type EstadoAviso } from './avisos';

const inicial: EstadoAviso = {};
const campo =
  'w-full rounded-lg border border-borda bg-superficie-2 px-3 py-2 text-sm outline-none transition focus:border-marca focus:bg-superficie focus:ring-2 focus:ring-marca/20';

/** O formulário de aviso para o celular das mentoradas. */
export function NovoAviso({ mentoradas }: { mentoradas: { id: string; nome: string }[] }) {
  const [estado, acao, enviando] = useActionState(enviarAviso, inicial);

  return (
    <form action={acao} className="space-y-3 px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <input name="titulo" required maxLength={80} placeholder="Título" className={campo} />
        <select name="para" defaultValue="todas" className={campo} aria-label="Para quem">
          <option value="todas">Todas as mentoradas</option>
          {mentoradas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>
      <textarea name="mensagem" required maxLength={300} rows={3} placeholder="Mensagem" className={campo} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? 'Enviando…' : 'Enviar aviso'}
        </button>
        {estado.erro ? <p className="text-sm text-parado">{estado.erro}</p> : null}
        {estado.ok ? <p className="text-sm text-texto-suave">{estado.ok}</p> : null}
      </div>
    </form>
  );
}
