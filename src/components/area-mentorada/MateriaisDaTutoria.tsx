'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { ItemDeMaterial } from '@/lib/notion/pilares';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { Icone } from './IconeNotion';
import { FormularioPreSessao } from './FormularioPreSessao';

type Material = { titulo: string; blocos: BlocoSimples[] };

const ehPreSessao = (t: string) =>
  /^pre[-\s]?sessao/.test(t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase());

const buscas = new Map<string, Promise<Material>>();
function buscarMaterial(id: string, mentoradaId: string): Promise<Material> {
  const chave = `${mentoradaId}:${id}`;
  let busca = buscas.get(chave);
  if (!busca) {
    busca = fetch(`/api/materiais/${id}?mentorada=${encodeURIComponent(mentoradaId)}`).then((r) =>
      r.ok ? (r.json() as Promise<Material>) : Promise.reject(new Error('falhou')),
    );
    busca.catch(() => buscas.delete(chave));
    buscas.set(chave, busca);
  }
  return busca;
}

/** Os cartões de material de uma tutoria; cada um abre com o conteúdo da página do Notion. */
export function MateriaisDaTutoria({ mentoradaId, itens }: { mentoradaId: string; itens: ItemDeMaterial[] }) {
  const [aberto, setAberto] = useState<ItemDeMaterial | null>(null);

  if (itens.length === 0) return <p className="text-sm text-texto-suave">Nenhum material ainda.</p>;

  return (
    <>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => setAberto(i)}
              onMouseEnter={() => void buscarMaterial(i.id, mentoradaId).catch(() => {})}
              onFocus={() => void buscarMaterial(i.id, mentoradaId).catch(() => {})}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-borda bg-superficie px-3 py-2 text-left text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-marca hover:shadow-[var(--sombra)]"
            >
              <Icone icone={i.icone} tamanho={16} />
              <span className="leading-snug">{i.titulo}</span>
            </button>
          </li>
        ))}
      </ul>

      {aberto ? <CartaoMaterial item={aberto} mentoradaId={mentoradaId} aoFechar={() => setAberto(null)} /> : null}
    </>
  );
}

function CartaoMaterial({ item, mentoradaId, aoFechar }: { item: ItemDeMaterial; mentoradaId: string; aoFechar: () => void }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    buscarMaterial(item.id, mentoradaId)
      .then((m) => vivo && setMaterial(m))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [item.id, mentoradaId]);

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
    <div role="dialog" aria-modal="true" aria-label={item.titulo} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]" />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-center gap-3 border-b border-borda px-6 py-4">
          <Icone icone={item.icone} tamanho={20} />
          <p className="display min-w-0 flex-1 text-xl leading-tight">{item.titulo}</p>
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
          {!material && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
          {material ? (
            ehPreSessao(item.titulo) ? (
              <FormularioPreSessao
                blocos={material.blocos}
                materialId={item.id}
                mentoradaId={mentoradaId}
                aoSalvar={() => buscas.delete(`${mentoradaId}:${item.id}`)}
              />
            ) : (
              <BlocosNotion blocos={material.blocos} />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
