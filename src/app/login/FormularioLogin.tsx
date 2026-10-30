'use client';

import { useActionState } from 'react';
import { enviarMagicLink, type EstadoLogin } from './actions';

const inicial: EstadoLogin = {};

export function FormularioLogin({ proximo, email }: { proximo?: string | null; email?: string | null }) {
  const [estado, acao, enviando] = useActionState(enviarMagicLink, inicial);

  // Bateu na porta errada: em vez de um "não pode", o endereço dela, com o
  // e-mail já no link para não digitar de novo.
  if (estado.portaCerta) {
    return (
      <div className="text-center">
        <p className="display text-2xl">Seu acesso é {estado.portaCerta.nome}</p>
        <p className="mt-3 text-sm leading-relaxed text-texto-suave">
          Esta entrada não é a sua. Clique abaixo para ir ao endereço certo: o seu e-mail já vai junto.
        </p>
        <a
          href={estado.portaCerta.url}
          className="mt-5 inline-block rounded-lg bg-marca px-5 py-3 text-sm font-medium tracking-wide text-marca-contraste transition hover:opacity-90"
        >
          Ir para a minha entrada
        </a>
      </div>
    );
  }

  if (estado.enviado) {
    return (
      <div className="text-center">
        <p className="display text-2xl">Link enviado</p>
        <p className="mt-3 text-sm leading-relaxed text-texto-suave">
          Se esse e-mail estiver cadastrado, o link de acesso chegou na caixa de entrada. Ele vale por uma
          hora. Não achou? Olhe também no spam.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-6">
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}
      <p className="text-sm leading-relaxed text-texto-suave">
        Não tem senha aqui. Você recebe um link no e-mail, clica uma vez e entra. Neste navegador você continua
        conectada: nas próximas vezes o painel abre direto.
      </p>

      <div>
        <label htmlFor="email" className="mb-2 block text-[12px] font-medium tracking-[0.18em] text-texto-suave uppercase">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={email ?? undefined}
          placeholder="o e-mail cadastrado na La Fortuna"
          className="w-full rounded-lg border border-borda bg-superficie-2 px-4 py-3 text-sm outline-none transition placeholder:text-texto-suave focus:border-marca focus:bg-superficie focus:ring-2 focus:ring-marca/20"
        />
      </div>

      {estado.erro ? (
        <p className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro}</p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-marca px-4 py-3 text-sm font-medium tracking-wide text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? 'Enviando…' : 'Receber o meu link de acesso'}
      </button>
    </form>
  );
}
