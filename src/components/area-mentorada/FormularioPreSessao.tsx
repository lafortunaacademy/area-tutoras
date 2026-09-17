'use client';

import { useState } from 'react';
import { Check, Loader2, Paperclip } from 'lucide-react';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';

type Anexar = (calloutId: string, arquivo: File) => Promise<BlocoSimples | 'grande' | null>;

type Salvar = (corpo: { acao: 'marcar'; blocoId: string; marcado: boolean } | { acao: 'texto' | 'adicionar'; blocoId: string; texto: string }) => Promise<string | null>;

/**
 * A pré-sessão como formulário: cada callout é uma pergunta; as opções (to-do)
 * marcam na hora e as respostas (parágrafos) salvam ao sair do campo. Tudo vai
 * direto para a página no Notion. Parágrafo que termina em "?" ou ":" é
 * pergunta, não resposta.
 */
export function FormularioPreSessao({
  blocos,
  materialId,
  mentoradaId,
  aoSalvar,
}: {
  blocos: BlocoSimples[];
  materialId: string;
  mentoradaId: string;
  /** Chamado depois de cada gravação, para quem guardou o conteúdo em cache. */
  aoSalvar: () => void;
}) {
  const salvar: Salvar = async (corpo) => {
    const r = await fetch(`/api/materiais/${materialId}/respostas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: mentoradaId, ...corpo }),
    });
    if (!r.ok) return null;
    aoSalvar();
    return ((await r.json()) as { id: string }).id;
  };

  const anexar: Anexar = async (calloutId, arquivo) => {
    const form = new FormData();
    form.append('mentorada', mentoradaId);
    form.append('bloco', calloutId);
    form.append('arquivo', arquivo);
    const r = await fetch(`/api/materiais/${materialId}/arquivos`, { method: 'POST', body: form });
    if (!r.ok) return r.status === 413 ? 'grande' : null;
    aoSalvar();
    return ((await r.json()) as { bloco: BlocoSimples }).bloco;
  };

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <p className="rounded-lg bg-superficie-2 px-3 py-2 text-xs text-texto-suave">
        As respostas são salvas sozinhas: as opções na hora, os textos quando você sai do campo.
      </p>
      {blocos.map((b) => (
        <Bloco key={b.id} bloco={b} salvar={salvar} anexar={anexar} />
      ))}
    </div>
  );
}

const ehPergunta = (t: string) => /[?:]\s*$/.test(t.trim());

const TIPOS_DE_ARQUIVO = new Set(['image', 'file', 'pdf', 'video', 'column_list']);
/** A pergunta pede arquivo: fala em print, foto, anexo… ou já tem arquivo dentro. */
const pedeArquivo = (b: BlocoSimples) =>
  /print|arquivo|anex|foto|imagem|upload|documento|pdf/i.test(b.texto) || b.filhos.some((f) => TIPOS_DE_ARQUIVO.has(f.tipo));

function Bloco({ bloco, salvar, anexar }: { bloco: BlocoSimples; salvar: Salvar; anexar: Anexar }) {
  if (bloco.tipo.startsWith('heading')) {
    return <h3 className="display pt-4 text-lg text-marca first:pt-0">{bloco.texto}</h3>;
  }
  if (bloco.tipo !== 'callout') return <BlocosNotion blocos={[bloco]} />;

  const temResposta = bloco.filhos.some((f) => f.tipo === 'to_do' || (f.tipo === 'paragraph' && !ehPergunta(f.texto)));
  const comArquivo = pedeArquivo(bloco);

  return (
    <div className="rounded-lg bg-superficie-2 p-3.5">
      {bloco.texto ? <p className="font-medium">{bloco.texto}</p> : null}
      <div className={`space-y-2 ${bloco.texto ? 'mt-2' : ''}`}>
        {bloco.filhos.map((f) =>
          f.tipo === 'to_do' ? (
            <Opcao key={f.id} bloco={f} salvar={salvar} />
          ) : f.tipo === 'paragraph' && !ehPergunta(f.texto) ? (
            <Resposta key={f.id} blocoId={f.id} inicial={f.texto} salvar={salvar} />
          ) : (
            <BlocosNotion key={f.id} blocos={[f]} />
          ),
        )}
        {temResposta || comArquivo ? null : <Resposta calloutId={bloco.id} inicial="" salvar={salvar} />}
        {comArquivo ? <EnviarArquivo calloutId={bloco.id} anexar={anexar} /> : null}
      </div>
    </div>
  );
}

function Opcao({ bloco, salvar }: { bloco: BlocoSimples; salvar: Salvar }) {
  const [marcado, setMarcado] = useState(Boolean(bloco.marcado));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);

  const alternar = async () => {
    const novo = !marcado;
    setMarcado(novo);
    setSalvando(true);
    setErro(false);
    const ok = await salvar({ acao: 'marcar', blocoId: bloco.id, marcado: novo });
    setSalvando(false);
    if (!ok) {
      setMarcado(!novo);
      setErro(true);
    }
  };

  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={marcado} onChange={alternar} className="peer sr-only" />
      <span
        aria-hidden
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-marca/30 ${
          marcado ? 'border-marca bg-marca text-marca-contraste' : 'border-borda bg-superficie'
        }`}
      >
        {marcado ? <Check size={11} strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">{bloco.texto}</span>
      {salvando ? <Loader2 aria-label="Salvando" size={13} className="mt-1 shrink-0 animate-spin text-texto-suave" /> : null}
      {erro ? <span className="shrink-0 text-xs text-parado">Não salvou</span> : null}
    </label>
  );
}

/** Campo de resposta. Sem `blocoId`, a primeira gravação cria o parágrafo dentro do callout. */
function Resposta({
  blocoId: idInicial,
  calloutId,
  inicial,
  salvar,
}: {
  blocoId?: string;
  calloutId?: string;
  inicial: string;
  salvar: Salvar;
}) {
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [blocoId, setBlocoId] = useState(idInicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');

  const gravar = async () => {
    if (texto === salvo) return;
    if (!blocoId && !texto.trim()) return;
    setEstado('salvando');
    const id = blocoId
      ? await salvar({ acao: 'texto', blocoId, texto })
      : await salvar({ acao: 'adicionar', blocoId: calloutId!, texto });
    if (!id) {
      setEstado('erro');
      return;
    }
    setBlocoId(id);
    setSalvo(texto);
    setEstado('salvo');
  };

  return (
    <div>
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (estado !== 'salvando') setEstado('parado');
        }}
        onBlur={gravar}
        rows={Math.min(8, Math.max(2, texto.split('\n').length + 1))}
        placeholder="Escreva sua resposta"
        className="w-full resize-y rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none transition focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
      <p className="h-4 text-right text-[11px] text-texto-suave" aria-live="polite">
        {estado === 'salvando' ? 'Salvando…' : estado === 'salvo' ? 'Salvo' : estado === 'erro' ? <span className="text-parado">Não salvou. Saia do campo de novo para tentar.</span> : ''}
      </p>
    </div>
  );
}

function EnviarArquivo({ calloutId, anexar }: { calloutId: string; anexar: Anexar }) {
  const [enviados, setEnviados] = useState<BlocoSimples[]>([]);
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'erro' | 'grande'>('parado');

  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setEstado('enviando');
    for (const arquivo of Array.from(arquivos)) {
      if (arquivo.size > 4 * 1024 * 1024) {
        setEstado('grande');
        return;
      }
      const bloco = await anexar(calloutId, arquivo);
      if (bloco === 'grande' || !bloco) {
        setEstado(bloco === 'grande' ? 'grande' : 'erro');
        return;
      }
      setEnviados((atual) => [...atual, bloco]);
    }
    setEstado('parado');
  };

  return (
    <div className="space-y-2">
      {enviados.length ? <BlocosNotion blocos={enviados} /> : null}
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-borda bg-superficie px-3 py-2 text-xs font-medium transition hover:border-marca hover:text-marca ${
          estado === 'enviando' ? 'pointer-events-none opacity-60' : ''
        }`}
      >
        {estado === 'enviando' ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Paperclip aria-hidden size={14} />}
        {estado === 'enviando' ? 'Enviando…' : 'Adicionar arquivo'}
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            void enviar(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {estado === 'grande' ? <p className="text-xs text-parado">Cada arquivo pode ter até 4 MB.</p> : null}
      {estado === 'erro' ? <p className="text-xs text-parado">Não foi possível enviar agora. Tente de novo.</p> : null}
    </div>
  );
}
