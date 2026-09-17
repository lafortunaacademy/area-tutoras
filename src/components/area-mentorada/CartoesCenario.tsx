'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Target, X } from 'lucide-react';
import type { CartaoCenario, ColunaCenario } from '@/lib/notion/cenarios';

/**
 * Os cartões de cenário (um por ano). Clicar abre o cartão centralizado por
 * cima da página, com o conteúdo buscado só nessa hora.
 */
/**
 * Busca do conteúdo de um cartão, guardada enquanto a página está aberta: passar
 * o mouse já começa a buscar, e quando o clique vem boa parte do caminho já foi.
 */
const buscas = new Map<string, Promise<ColunaCenario[]>>();
function buscarCenario(cartaoId: string, mentoradaId: string): Promise<ColunaCenario[]> {
  const chave = `${mentoradaId}:${cartaoId}`;
  let busca = buscas.get(chave);
  if (!busca) {
    busca = fetch(`/api/cenarios/${cartaoId}?mentorada=${encodeURIComponent(mentoradaId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falhou'))))
      .then((j: { colunas: ColunaCenario[] }) => j.colunas);
    // Falhou? Esquece, para a próxima tentativa buscar de novo.
    busca.catch(() => buscas.delete(chave));
    buscas.set(chave, busca);
  }
  return busca;
}

export function CartoesCenario({ mentoradaId, cartoes }: { mentoradaId: string; cartoes: CartaoCenario[] }) {
  const [aberto, setAberto] = useState<CartaoCenario | null>(null);

  return (
    <>
      <ul className="mb-4 flex flex-wrap gap-3">
        {cartoes.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setAberto(c)}
              onMouseEnter={() => void buscarCenario(c.id, mentoradaId).catch(() => {})}
              onFocus={() => void buscarCenario(c.id, mentoradaId).catch(() => {})}
              className="inline-flex items-center gap-3 rounded-xl border border-borda bg-fundo px-4 py-3 text-left transition hover:border-marca hover:shadow-[var(--sombra)]"
            >
              <Target aria-hidden size={16} className="text-marca" />
              <span>
                <span className="block text-sm font-medium">{c.titulo}</span>
                <span className="block text-xs text-texto-suave tabular-nums">{c.ano || 'Sem ano'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {aberto ? <Cartao cartao={aberto} mentoradaId={mentoradaId} aoFechar={() => setAberto(null)} /> : null}
    </>
  );
}

function Cartao({
  cartao,
  mentoradaId,
  aoFechar,
}: {
  cartao: CartaoCenario;
  mentoradaId: string;
  aoFechar: () => void;
}) {
  const [colunas, setColunas] = useState<ColunaCenario[] | null>(null);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    buscarCenario(cartao.id, mentoradaId)
      .then((c) => vivo && setColunas(c))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [cartao.id, mentoradaId]);

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
      aria-label={`${cartao.titulo} ${cartao.ano}`}
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
        className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="display text-xl leading-tight">{cartao.titulo}</p>
            {cartao.ano ? <p className="mt-0.5 text-xs text-texto-suave tabular-nums">{cartao.ano}</p> : null}
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
          {!colunas && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar este cenário agora.</p> : null}
          {colunas && colunas.length === 0 ? (
            <p className="text-sm text-texto-suave">Este cenário ainda está em branco.</p>
          ) : null}
          {colunas && colunas.length > 0 ? (
            <div className={`grid gap-4 ${colunas.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {colunas.map((c, i) => (
                <Coluna key={i} coluna={c} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Coluna({ coluna }: { coluna: ColunaCenario }) {
  return (
    <section className="rounded-xl border border-borda bg-fundo/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Target aria-hidden size={15} className="text-marca" />
        {coluna.titulo || 'Cenário'}
      </h3>

      {coluna.itens.length === 0 ? (
        <p className="mt-3 text-sm text-texto-suave">Ainda não preenchido.</p>
      ) : (
        <div className="mt-3 space-y-2 text-sm leading-relaxed">
          {coluna.itens.map((item, i) => {
            switch (item.tipo) {
              case 'secao':
                return (
                  <h4
                    key={i}
                    className="optima border-b border-borda pt-3 pb-1 text-xs tracking-[0.14em] text-marca uppercase first:pt-0"
                  >
                    {item.texto}
                  </h4>
                );
              case 'destaque':
                return (
                  <p key={i} className="mt-3 w-fit rounded-md bg-marca-suave px-2 py-0.5 text-xs font-medium text-marca">
                    {item.texto}
                  </p>
                );
              case 'item':
                return (
                  <p key={i} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-texto-suave" />
                    <span className="whitespace-pre-line">{item.texto}</span>
                  </p>
                );
              default:
                return (
                  <p key={i} className="whitespace-pre-line">
                    {item.texto}
                  </p>
                );
            }
          })}
        </div>
      )}
    </section>
  );
}
