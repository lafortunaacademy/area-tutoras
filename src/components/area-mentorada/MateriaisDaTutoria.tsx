'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Loader2, X } from 'lucide-react';
import type { ItemDeMaterial } from '@/lib/notion/blocks';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { FormularioPreSessao } from './FormularioPreSessao';
import { Icone } from './IconeNotion';

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

/** Cada material da tutoria vira um toggle; o conteúdo do Notion é lido quando ele abre. */
export function MateriaisDaTutoria({
  mentoradaId,
  itens,
  admin,
}: {
  mentoradaId: string;
  itens: ItemDeMaterial[];
  /** Só o administrativo vê o link de preenchimento. */
  admin: boolean;
}) {
  if (itens.length === 0) return <p className="text-sm text-texto-suave">Nenhum material ainda.</p>;

  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.id}>
          <Material item={i} mentoradaId={mentoradaId} admin={admin} />
        </li>
      ))}
    </ul>
  );
}

function Material({ item, mentoradaId, admin }: { item: ItemDeMaterial; mentoradaId: string; admin: boolean }) {
  const preSessao = ehPreSessao(item.titulo);
  const [aberto, setAberto] = useState(false);
  const [material, setMaterial] = useState<Material | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = () => {
    if (material) return;
    setErro(false);
    buscarMaterial(item.id, mentoradaId)
      .then(setMaterial)
      .catch(() => setErro(true));
  };

  return (
    <>
      <button
        type="button"
        onMouseEnter={carregar}
        onFocus={carregar}
        onClick={() => {
          carregar();
          setAberto(true);
        }}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition hover:border-marca ${
          preSessao ? 'border-marca/40 bg-marca-suave/40 text-marca' : 'border-borda bg-superficie'
        }`}
      >
        <Icone icone={item.icone} tamanho={16} />
        <span className="min-w-0 flex-1 leading-snug">{item.titulo}</span>
        <ChevronRight aria-hidden size={14} className="shrink-0 text-texto-suave" />
      </button>

      {aberto ? (
        <Tela titulo={item.titulo} aoFechar={() => setAberto(false)}>
          {!material && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
          {material ? (
            <FormularioPreSessao
              blocos={material.blocos}
              materialId={item.id}
              mentoradaId={mentoradaId}
              aoSalvar={() => buscas.delete(`${mentoradaId}:${item.id}`)}
              base={(b) => <MateriaisDaTutoria mentoradaId={mentoradaId} itens={b.itens ?? []} admin={admin} />}
            />
          ) : null}
        </Tela>
      ) : null}
    </>
  );
}

/** A tela que abre por cima da página, centralizada, com o conteúdo do material. */
function Tela({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]" />

      <div className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)]">
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <p className="display min-w-0 flex-1 text-xl leading-tight">{titulo}</p>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <X aria-hidden size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
