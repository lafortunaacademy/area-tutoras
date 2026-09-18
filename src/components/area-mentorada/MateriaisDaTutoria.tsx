'use client';

import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
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

/** Cada material da tutoria vira um toggle; o conteúdo do Notion é lido quando ele abre. */
export function MateriaisDaTutoria({ mentoradaId, itens }: { mentoradaId: string; itens: ItemDeMaterial[] }) {
  if (itens.length === 0) return <p className="text-sm text-texto-suave">Nenhum material ainda.</p>;

  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.id}>
          <Material item={i} mentoradaId={mentoradaId} />
        </li>
      ))}
    </ul>
  );
}

function Material({ item, mentoradaId }: { item: ItemDeMaterial; mentoradaId: string }) {
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
    <details
      className="group rounded-lg border border-borda bg-superficie"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) carregar();
      }}
    >
      <summary
        onMouseEnter={carregar}
        className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden"
      >
        <ChevronRight aria-hidden size={14} className="shrink-0 text-texto-suave transition-transform group-open:rotate-90" />
        <Icone icone={item.icone} tamanho={16} />
        <span className="leading-snug">{item.titulo}</span>
      </summary>

      <div className="border-t border-borda px-4 py-4">
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
    </details>
  );
}
