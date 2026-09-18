'use client';

import { useState } from 'react';
import { Check, ChevronRight, Link2 } from 'lucide-react';
import type { Material } from '@/lib/tutorias/modelo';
import type { Progresso } from '@/lib/tutorias/respostas';
import { gerarLinkDePreenchimento } from '@/app/mentoradas/actions';
import { PainelDoFormulario } from './PainelDoFormulario';
import { IconeDoModelo } from './IconeDoModelo';

const ehPreSessao = (t: string) =>
  /^pre[-\s]?sessao/.test(t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase());

/**
 * Os materiais de uma tutoria, cada um num toggle. Grupo abre outros toggles;
 * formulário carrega perguntas e respostas quando abre; conteúdo e especiais
 * ainda não foram trazidos para o app.
 */
export function ArvoreDeMateriais({
  materiais,
  mentoradaId,
  progresso,
  admin,
  paraMentorada = false,
}: {
  materiais: Material[];
  mentoradaId: string;
  /** Por formulário: quantas perguntas estão respondidas e quando foi o último envio. */
  progresso: Progresso;
  /** Só o administrativo vê o link de preenchimento. */
  admin: boolean;
  /** Quem está vendo é a própria mentorada. */
  paraMentorada?: boolean;
}) {
  if (materiais.length === 0) return <p className="text-sm text-texto-suave">Nenhum material ainda.</p>;
  return (
    <ul className="space-y-2">
      {materiais.map((m) => (
        <li key={m.id}>
          <ItemDaArvore material={m} mentoradaId={mentoradaId} progresso={progresso} admin={admin} paraMentorada={paraMentorada} />
        </li>
      ))}
    </ul>
  );
}

function ItemDaArvore({
  material,
  mentoradaId,
  progresso,
  admin,
  paraMentorada,
}: {
  material: Material;
  mentoradaId: string;
  progresso: Progresso;
  admin: boolean;
  paraMentorada: boolean;
}) {
  const preSessao = material.tipo === 'formulario' && ehPreSessao(material.nome);
  // O formulário só carrega quando o toggle abre pela primeira vez.
  const [aberto, setAberto] = useState(false);

  return (
    <details
      className={`group rounded-lg border bg-superficie ${preSessao ? 'border-marca/40 bg-marca-suave/40' : 'border-borda'}`}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) setAberto(true);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden size={14} className="shrink-0 text-texto-suave transition-transform group-open:rotate-90" />
        <IconeDoModelo icone={material.icone} tamanho={16} />
        <span className={`leading-snug ${preSessao ? 'text-marca' : ''}`}>{material.nome}</span>
        {admin && preSessao ? <CopiarLink mentoradaId={mentoradaId} materialId={material.id} /> : null}
      </summary>

      <div className="border-t border-borda px-4 py-4">
        {material.tipo === 'grupo' ? (
          <ArvoreDeMateriais materiais={material.filhos} mentoradaId={mentoradaId} progresso={progresso} admin={admin} paraMentorada={paraMentorada} />
        ) : material.tipo === 'formulario' ? (
          aberto ? <PainelDoFormulario materialId={material.id} mentoradaId={mentoradaId} paraMentorada={paraMentorada} /> : null
        ) : (
          <p className="text-sm text-texto-suave">Este material ainda está sendo trazido para o app.</p>
        )}
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
