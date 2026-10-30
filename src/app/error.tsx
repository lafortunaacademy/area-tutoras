'use client';

/**
 * A tela de quando algo quebra.
 *
 * Existe por um motivo específico: antes, uma falha ao conferir o acesso caía
 * na tela de login, e quem estava logada achava que tinha sido desconectada.
 * Aqui a pessoa lê o que houve e tenta de novo, sem perder a sessão.
 */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const doAcesso = error.message === 'NAO_CONSEGUI_CONFERIR_O_ACESSO';

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-borda bg-superficie p-7 text-center">
        <h1 className="display text-2xl text-marca">
          {doAcesso ? 'Não consegui conferir o seu acesso' : 'Alguma coisa não carregou'}
        </h1>

        <p className="mt-2 text-sm text-texto-suave">
          {doAcesso
            ? 'Você continua conectada. Foi o banco que não respondeu agora; tentar de novo costuma resolver.'
            : 'A página não terminou de carregar. Tentar de novo costuma resolver.'}
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-marca px-5 py-2.5 text-sm font-medium text-marca-contraste transition hover:opacity-90"
        >
          Tentar de novo
        </button>

        {error.digest ? <p className="mt-4 text-[11px] text-texto-suave">Código: {error.digest}</p> : null}
      </div>
    </div>
  );
}
