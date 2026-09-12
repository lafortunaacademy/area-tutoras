'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, X } from 'lucide-react';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from './BlocosNotion';

export type LinhaTabela = {
  id: string;
  /** Título mostrado no card ao abrir. */
  titulo: string;
  celulas: string[];
  /** Presente só quando esta tutora pode editar o registro. */
  editarHref?: string;
};

/**
 * Lista em tabela, no mesmo formato do Notion, com o conteúdo num card.
 *
 * A tabela é o formato certo aqui: são registros curtos e comparáveis — data,
 * quem escreveu, título —, e a tutora quer varrer a coluna, não ler cartão por
 * cartão. O conteúdo longo fica a um clique.
 */
export function TabelaNotion({
  colunas,
  linhas,
  mentoradaId,
  vazio,
}: {
  colunas: { nome: string; largura?: string }[];
  linhas: LinhaTabela[];
  mentoradaId: string;
  vazio: string;
}) {
  const [aberta, setAberta] = useState<LinhaTabela | null>(null);

  if (linhas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
        {vazio}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
        <table className="w-full min-w-[36rem] table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {colunas.map((c) => (
                <th
                  key={c.nome}
                  className={`rotulo px-4 py-2 text-[10px] font-normal whitespace-nowrap text-texto-suave ${c.largura ?? ''}`}
                >
                  {c.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                onClick={() => setAberta(l)}
                className="cursor-pointer border-b border-borda/60 transition last:border-0 hover:bg-fundo"
              >
                {l.celulas.map((valor, i) => (
                  <td
                    key={colunas[i]?.nome ?? i}
                    className={`truncate px-4 py-2 whitespace-nowrap ${
                      i === 0 ? 'font-medium' : 'text-texto-suave'
                    }`}
                    title={valor}
                  >
                    {valor || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aberta ? (
        <Card linha={aberta} mentoradaId={mentoradaId} aoFechar={() => setAberta(null)} />
      ) : null}
    </>
  );
}

function Card({
  linha,
  mentoradaId,
  aoFechar,
}: {
  linha: LinhaTabela;
  mentoradaId: string;
  aoFechar: () => void;
}) {
  const [blocos, setBlocos] = useState<BlocoSimples[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/notion-content/${linha.id}?mentorada=${encodeURIComponent(mentoradaId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falhou'))))
      .then((j: { blocos: BlocoSimples[] }) => vivo && setBlocos(j.blocos))
      .catch(() => vivo && setErro('Não consegui carregar o conteúdo agora.'));
    return () => {
      vivo = false;
    };
  }, [linha.id, mentoradaId]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus();
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={linha.titulo}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]"
      />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="display text-lg leading-tight">{linha.titulo}</p>
            <p className="mt-1 text-xs text-texto-suave">
              {linha.celulas.filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <X aria-hidden size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {!blocos && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">{erro}</p> : null}
          {blocos ? <BlocosNotion blocos={blocos} /> : null}

          {linha.editarHref ? (
            <Link
              href={linha.editarHref}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-medium transition hover:border-marca hover:text-marca"
            >
              <Pencil aria-hidden size={13} />
              Editar
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
