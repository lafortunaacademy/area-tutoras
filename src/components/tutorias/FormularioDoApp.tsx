'use client';

import { useState } from 'react';
import { Check, FileText, Loader2, Paperclip, X } from 'lucide-react';
import type { Pergunta } from '@/lib/tutorias/modelo';
import type { Anexo, Valor } from '@/lib/tutorias/respostas';

/**
 * Um formulário das tutorias (pré-sessão, 1:1…), com as respostas guardadas no
 * app. Opções salvam na hora; textos, ao sair do campo; anexos, ao escolher.
 * Sem `podeEditar` (a tutora), mostra só as respostas.
 */
export function FormularioDoApp({
  perguntas,
  respostas,
  mentoradaId,
  podeEditar,
  token,
}: {
  perguntas: Pergunta[];
  respostas: Record<string, Valor>;
  mentoradaId: string;
  podeEditar: boolean;
  /** Link de preenchimento, quando a pessoa entrou por ele. */
  token?: string;
}) {
  // Agrupa por seção, na ordem em que aparecem.
  const secoes: { titulo: string | null; perguntas: Pergunta[] }[] = [];
  for (const p of perguntas) {
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.titulo === p.secao) ultima.perguntas.push(p);
    else secoes.push({ titulo: p.secao, perguntas: [p] });
  }

  const ctx = { mentoradaId, token, podeEditar };

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {podeEditar ? (
        <p className="rounded-lg bg-superficie-2 px-3 py-2 text-xs text-texto-suave">
          As respostas são salvas sozinhas: as opções na hora, os textos quando você sai do campo.
        </p>
      ) : null}
      {secoes.map((s, i) => (
        <section key={i} className="space-y-3">
          {s.titulo ? <h3 className="display text-lg text-marca">{s.titulo}</h3> : null}
          {s.perguntas.map((p) =>
            p.tipo === 'aviso' ? (
              <p key={p.id} className="font-medium">{p.texto}</p>
            ) : (
              <div key={p.id} className="rounded-lg bg-superficie-2 p-3.5">
                <p className="font-medium">{p.texto}</p>
                {p.ajuda ? <p className="mt-1 whitespace-pre-line text-xs text-texto-suave">{p.ajuda}</p> : null}
                <div className="mt-2">
                  {p.tipo === 'texto' ? (
                    <CampoTexto pergunta={p} inicial={respostas[p.id]?.texto ?? ''} ctx={ctx} />
                  ) : p.tipo === 'opcoes' ? (
                    <Opcoes pergunta={p} inicial={respostas[p.id]?.opcoes ?? []} ctx={ctx} />
                  ) : (
                    <Arquivos pergunta={p} inicial={respostas[p.id]?.arquivos ?? []} ctx={ctx} />
                  )}
                </div>
              </div>
            ),
          )}
        </section>
      ))}
    </div>
  );
}

type Ctx = { mentoradaId: string; token?: string; podeEditar: boolean };

async function salvar(ctx: Ctx, perguntaId: string, valor: { texto?: string; opcoes?: string[] }): Promise<boolean> {
  const r = await fetch('/api/tutorias/respostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mentorada: ctx.mentoradaId, perguntaId, token: ctx.token, ...valor }),
  });
  return r.ok;
}

function CampoTexto({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: string; ctx: Ctx }) {
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');

  if (!ctx.podeEditar) {
    return inicial ? <p className="whitespace-pre-line">{inicial}</p> : <p className="text-texto-suave">Sem resposta.</p>;
  }

  const gravar = async () => {
    if (texto === salvo) return;
    setEstado('salvando');
    if (await salvar(ctx, pergunta.id, { texto })) {
      setSalvo(texto);
      setEstado('salvo');
    } else {
      setEstado('erro');
    }
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

function Opcoes({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: string[]; ctx: Ctx }) {
  const [marcadas, setMarcadas] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'erro'>('parado');

  const alternar = async (opcao: string) => {
    if (!ctx.podeEditar) return;
    const antes = marcadas;
    const novas = marcadas.includes(opcao) ? marcadas.filter((o) => o !== opcao) : [...marcadas, opcao];
    setMarcadas(novas);
    setEstado('salvando');
    if (await salvar(ctx, pergunta.id, { opcoes: novas })) setEstado('parado');
    else {
      setMarcadas(antes);
      setEstado('erro');
    }
  };

  return (
    <div className="space-y-1.5">
      {pergunta.opcoes.map((o) => {
        const marcado = marcadas.includes(o);
        return (
          <label key={o} className={`flex items-start gap-2.5 ${ctx.podeEditar ? 'cursor-pointer' : ''}`}>
            <input type="checkbox" checked={marcado} disabled={!ctx.podeEditar} onChange={() => alternar(o)} className="peer sr-only" />
            <span
              aria-hidden
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-marca/30 ${
                marcado ? 'border-marca bg-marca text-marca-contraste' : 'border-borda bg-superficie'
              }`}
            >
              {marcado ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span className={!ctx.podeEditar && !marcado ? 'text-texto-suave' : ''}>{o}</span>
          </label>
        );
      })}
      {estado === 'salvando' ? <p className="text-[11px] text-texto-suave">Salvando…</p> : null}
      {estado === 'erro' ? <p className="text-[11px] text-parado">Não salvou. Tente de novo.</p> : null}
    </div>
  );
}

function Arquivos({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: Anexo[]; ctx: Ctx }) {
  const [anexos, setAnexos] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'erro' | 'grande'>('parado');

  const enviar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setEstado('enviando');
    for (const arquivo of Array.from(lista)) {
      if (arquivo.size > 4 * 1024 * 1024) {
        setEstado('grande');
        return;
      }
      const form = new FormData();
      form.append('mentorada', ctx.mentoradaId);
      form.append('pergunta', pergunta.id);
      form.append('arquivo', arquivo);
      if (ctx.token) form.append('token', ctx.token);
      const r = await fetch('/api/tutorias/arquivos', { method: 'POST', body: form });
      if (!r.ok) {
        setEstado(r.status === 413 ? 'grande' : 'erro');
        return;
      }
      const { anexo } = (await r.json()) as { anexo: Anexo };
      setAnexos((atual) => [...atual, anexo]);
    }
    setEstado('parado');
  };

  const remover = async (a: Anexo) => {
    const r = await fetch('/api/tutorias/arquivos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: ctx.mentoradaId, perguntaId: pergunta.id, caminho: a.caminho, token: ctx.token }),
    });
    if (r.ok) setAnexos((atual) => atual.filter((x) => x.caminho !== a.caminho));
  };

  return (
    <div className="space-y-2">
      {anexos.length ? (
        <ul className="flex flex-wrap gap-2">
          {anexos.map((a) => (
            <li key={a.caminho} className="group relative">
              <a href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-borda bg-superficie">
                {a.tipo.startsWith('image/') && a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.nome} className="h-24 w-auto max-w-40 object-cover" />
                ) : (
                  <span className="flex h-24 w-40 flex-col items-center justify-center gap-1 px-2 text-center text-xs text-texto-suave">
                    <FileText aria-hidden size={18} />
                    <span className="line-clamp-2 break-all">{a.nome}</span>
                  </span>
                )}
              </a>
              {ctx.podeEditar ? (
                <button
                  type="button"
                  onClick={() => remover(a)}
                  aria-label={`Remover ${a.nome}`}
                  className="absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border border-borda bg-superficie text-texto-suave shadow group-hover:flex hover:text-parado"
                >
                  <X size={12} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !ctx.podeEditar ? (
        <p className="text-texto-suave">Nenhum arquivo.</p>
      ) : null}

      {ctx.podeEditar ? (
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
      ) : null}
      {estado === 'grande' ? <p className="text-xs text-parado">Cada arquivo pode ter até 4 MB.</p> : null}
      {estado === 'erro' ? <p className="text-xs text-parado">Não foi possível enviar agora. Tente de novo.</p> : null}
    </div>
  );
}
