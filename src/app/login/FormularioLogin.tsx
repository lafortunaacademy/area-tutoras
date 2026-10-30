'use client';

import { useActionState } from 'react';
import { entrarComCodigo, enviarMagicLink, type EstadoLogin } from './actions';

const inicial: EstadoLogin = {};

export function FormularioLogin({ proximo }: { proximo?: string | null }) {
  const [estado, acao, enviando] = useActionState(enviarMagicLink, inicial);

  if (estado.enviado && estado.email) return <DigitarCodigo email={estado.email} />;

  return (
    <form action={acao} className="space-y-6">
      {proximo ? <input type="hidden" name="proximo" value={proximo} /> : null}
      <p className="text-sm leading-relaxed text-texto-suave">
        Não tem senha aqui. Você recebe um código no e-mail e entra. Neste navegador você continua
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

/**
 * Depois do pedido: o e-mail traz um botão e um código. No computador o botão
 * basta; no app de celular o código é o caminho, porque o botão abriria o
 * navegador e a sessão ficaria lá, fora do app.
 */
function DigitarCodigo({ email }: { email: string }) {
  const [estado, acao, entrando] = useActionState(entrarComCodigo, { enviado: true, email } as EstadoLogin);

  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="email" value={email} />
      <div className="text-center">
        <p className="display text-2xl">Confira o seu e-mail</p>
        <p className="mt-3 text-sm leading-relaxed text-texto-suave">
          Se <strong className="font-medium text-texto">{email}</strong> estiver cadastrado, chegou uma mensagem com um
          código. Digite aqui, ou toque no botão do e-mail. Não achou? Olhe também no spam.
        </p>
      </div>

      <div>
        <label htmlFor="codigo" className="mb-2 block text-[12px] font-medium tracking-[0.18em] text-texto-suave uppercase">
          Código
        </label>
        <input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          required
          autoFocus
          placeholder="000000"
          className="w-full rounded-lg border border-borda bg-superficie-2 px-4 py-3 text-center text-2xl tracking-[0.4em] outline-none transition placeholder:text-texto-suave/50 focus:border-marca focus:bg-superficie focus:ring-2 focus:ring-marca/20"
        />
      </div>

      {estado.erro ? <p className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro}</p> : null}

      <button
        type="submit"
        disabled={entrando}
        className="w-full rounded-lg bg-marca px-4 py-3 text-sm font-medium tracking-wide text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
      >
        {entrando ? 'Entrando…' : 'Entrar'}
      </button>
      <p className="text-center text-xs text-texto-suave">
        <a href="/login" className="underline underline-offset-2">
          Usar outro e-mail ou pedir um código novo
        </a>
      </p>
    </form>
  );
}
