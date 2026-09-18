'use client';

import { useState } from 'react';
import { Check, ChevronRight, Link2, Loader2 } from 'lucide-react';
import type { ItemDeMaterial } from '@/lib/notion/pilares';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { Icone } from './IconeNotion';
import { FormularioPreSessao } from './FormularioPreSessao';
import { gerarLinkDePreenchimento } from '@/app/mentoradas/actions';

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
      className={`group rounded-lg border bg-superficie ${preSessao ? 'border-marca/40 bg-marca-suave/40' : 'border-borda'}`}
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
        <span className={`leading-snug ${preSessao ? 'text-marca' : ''}`}>{item.titulo}</span>
        {admin && preSessao ? <CopiarLink mentoradaId={mentoradaId} materialId={item.id} /> : null}
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
          preSessao ? (
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

/** Copia o link de preenchimento da pré-sessão. Só aparece para o administrativo. */
function CopiarLink({ mentoradaId, materialId }: { mentoradaId: string; materialId: string }) {
  const [estado, setEstado] = useState<'parado' | 'copiando' | 'copiado' | 'erro'>('parado');

  const copiar = async (e: React.MouseEvent) => {
    // Dentro do <summary>: sem isto o clique abriria ou fecharia o toggle.
    e.preventDefault();
    e.stopPropagation();
    setEstado('copiando');
    try {
      const link = await gerarLinkDePreenchimento(mentoradaId, materialId);
      if (!link) throw new Error('sem link');
      await navigator.clipboard.writeText(link);
      setEstado('copiado');
      setTimeout(() => setEstado('parado'), 2500);
    } catch {
      setEstado('erro');
    }
  };

  return (
    <button
      type="button"
      onClick={copiar}
      title="Copiar link para a mentorada preencher, sem precisar entrar no sistema"
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-2 py-1 text-[11px] font-medium text-texto-suave transition hover:border-marca hover:text-marca"
    >
      {estado === 'copiado' ? <Check aria-hidden size={12} /> : <Link2 aria-hidden size={12} />}
      {estado === 'copiando' ? 'Gerando…' : estado === 'copiado' ? 'Link copiado' : estado === 'erro' ? 'Não deu' : 'Link de preenchimento'}
    </button>
  );
}
