'use client';

import { useActionState } from 'react';
import { enviarMagicLink, entrarComCodigo, type EstadoLogin } from './actions';

const inicial: EstadoLogin = {};

/**
 * Depois do envio: o aviso do link e, logo abaixo, o campo do código.
 *
 * O código vem no mesmo e-mail e serve para onde o link não vai: dentro de um
 * aplicativo, ou quando o programa de e-mail embrulha o endereço e quebra o
 * link no caminho.
 */
function PassoDoCodigo({ email, erro }: { email: string; erro?: string }) {
  const [estado, acao, enviando] = useActionState(entrarComCodigo, inicial);

  return (
    <div className="text-center">
      <p className="display text-2xl">Link enviado</p>
      <p className="mt-3 text-sm leading-relaxed text-texto-suave">
        Se esse e-mail estiver cadastrado, o acesso chegou na caixa de entrada. Clique no botão do e-mail,
        ou digite aqui o código que veio junto. Não achou? Olhe também no spam.
      </p>

      <form action={acao} className="mt-6">
        <input type="hidden" name="email" value={email} />
        <label htmlFor="codigo" className="sr-only">
          Código do e-mail
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="w-full rounded-lg border border-borda bg-superficie-2 px-4 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none transition placeholder:text-texto-suave focus:border-marca focus:bg-superficie focus:ring-2 focus:ring-marca/20"
        />

        {estado.erro || erro ? (
          <p className="mt-3 rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro || erro}</p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="mt-4 w-full rounded-lg bg-marca px-4 py-3 text-sm font-medium tracking-wide text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? 'Conferindo…' : 'Entrar com o código'}
        </button>
      </form>
    </div>
  );
}

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
    return <PassoDoCodigo email={estado.email ?? ''} erro={estado.erro} />;
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
