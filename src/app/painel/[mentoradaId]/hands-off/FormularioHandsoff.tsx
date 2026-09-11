'use client';

import { useActionState } from 'react';
import { HANDSOFF_SECOES } from '@/lib/notion/config';
import { salvarHandsoff, type EstadoHandsoff } from './actions';

const inicial: EstadoHandsoff = {};

/**
 * O formulário é gerado das seções do template do Notion, na mesma ordem.
 *
 * Assim não existe "o app tem 4 campos e o Notion tem 8": seção nova lá aparece
 * aqui sozinha, e o que se escreve aqui nasce com o mesmo formato de lá.
 */
export function FormularioHandsoff({
  mentoradaId,
  handsoffId,
  valores,
}: {
  mentoradaId: string;
  /** Presente ao editar; ausente ao criar. */
  handsoffId?: string;
  valores?: { dataSessao: string; secoes: Record<string, string> };
}) {
  const [estado, acao, salvando] = useActionState(salvarHandsoff, inicial);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={acao} className="space-y-6">
      <input type="hidden" name="mentoradaId" value={mentoradaId} />
      {handsoffId ? <input type="hidden" name="handsoffId" value={handsoffId} /> : null}

      <Campo rotulo="Data da sessão" htmlFor="dataSessao">
        <input
          id="dataSessao"
          name="dataSessao"
          type="date"
          defaultValue={valores?.dataSessao || hoje}
          required
          className={ENTRADA}
        />
      </Campo>

      {HANDSOFF_SECOES.map((secao) => (
        <Campo
          key={secao.key}
          rotulo={secao.titulo}
          ajuda={
            secao.formato === 'bullets'
              ? `${secao.ajuda} — uma linha por bullet`
              : secao.ajuda
          }
          htmlFor={secao.key}
        >
          {secao.formato === 'linha' ? (
            <input
              id={secao.key}
              name={secao.key}
              type="text"
              required
              defaultValue={valores?.secoes[secao.key] ?? ''}
              className={ENTRADA}
            />
          ) : (
            <textarea
              id={secao.key}
              name={secao.key}
              rows={secao.formato === 'bullets' ? 5 : 3}
              defaultValue={valores?.secoes[secao.key] ?? ''}
              className={ENTRADA}
            />
          )}
        </Campo>
      ))}

      {estado.erro ? (
        <p className="rounded-lg bg-parado-suave px-3 py-2 text-sm text-parado">{estado.erro}</p>
      ) : null}

      <button
        type="submit"
        disabled={salvando}
        className="rounded-lg bg-marca px-5 py-2.5 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
      >
        {salvando ? 'Salvando…' : handsoffId ? 'Salvar alterações' : 'Salvar hands-off'}
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
