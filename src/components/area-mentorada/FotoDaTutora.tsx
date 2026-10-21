'use client';

import { useState } from 'react';

/**
 * A foto da tutora do HUB, pequena e redonda, ao lado do nome.
 *
 * Vem da mesma rota das fotos do HUB, no tamanho de avatar (uns 400 bytes).
 * Sem foto — ou se ela falhar —, fica a inicial do nome.
 */
export function FotoDaTutora({ id, nome }: { id: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return (
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[10px] font-medium text-texto"
      >
        {nome.charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- já sai reduzida e em cache pela rota
    <img
      src={`/api/fotos/tutoras/${id}?tamanho=mini`}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFalhou(true)}
      className="size-5 shrink-0 rounded-full bg-marca-suave object-cover object-top"
    />
  );
}

/** Os nomes das tutoras de uma sessão, cada um com a foto. */
export function TutorasDaSessao({ equipe, nomes }: { equipe?: { id: string; nome: string }[]; nomes: string[] }) {
  if (!equipe?.length) return <>{nomes.join(', ') || '—'}</>;

  return (
    <span className="flex flex-col gap-0.5">
      {equipe.map((t) => (
        <span key={t.id} className="flex items-center gap-2 whitespace-nowrap">
          <FotoDaTutora id={t.id} nome={t.nome} />
          {t.nome}
        </span>
      ))}
    </span>
  );
}
