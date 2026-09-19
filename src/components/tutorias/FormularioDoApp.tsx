'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, FileText, Loader2, Paperclip, Plus, X } from 'lucide-react';
import { Tarefas, type Tarefa } from '@/components/area-mentorada/Tarefas';
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
  aoSalvar,
  previa = false,
  semAviso = false,
  envioId,
}: {
  perguntas: Pergunta[];
  respostas: Record<string, Valor>;
  mentoradaId: string;
  podeEditar: boolean;
  /** Chamado a cada gravação que deu certo. */
  aoSalvar?: () => void;
  /** Editar um registro já salvo (tutoria, carteira…) em vez do rascunho. */
  envioId?: string;
  /** Prévia para a equipe: dá para mexer, mas nada é salvo. */
  previa?: boolean;
  /**
   * Sem as explicações (que salva sozinho, "um por linha"…): a equipe já sabe.
   * A dos Próximos passos fica: avisa que ali são as mesmas Tarefas da mentoria.
   */
  semAviso?: boolean;
}) {
  // Agrupa por seção, na ordem em que aparecem.
  const secoes: { titulo: string | null; perguntas: Pergunta[] }[] = [];
  for (const p of perguntas) {
    const ultima = secoes[secoes.length - 1];
    if (ultima && ultima.titulo === p.secao) ultima.perguntas.push(p);
    else secoes.push({ titulo: p.secao, perguntas: [p] });
  }

  const ctx: Ctx = { mentoradaId, podeEditar, aoSalvar, previa, envioId };

  return (
    <div className="space-y-6 text-sm leading-relaxed">
      {podeEditar && !previa && !semAviso ? (
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
                {p.ajuda && podeEditar && (!semAviso || p.tipo === 'tarefas') ? <p className="mt-1 whitespace-pre-line text-xs text-texto-suave">{p.ajuda}</p> : null}
                <div className="mt-2">
                  {p.tipo === 'texto' ? (
                    <CampoTexto pergunta={p} inicial={respostas[p.id]?.texto ?? ''} ctx={ctx} />
                  ) : p.tipo === 'tabela' ? (
                    <Tabela pergunta={p} inicial={respostas[p.id]?.linhas ?? []} ctx={ctx} />
                  ) : p.tipo === 'links' ? (
                    <Links pergunta={p} inicial={respostas[p.id]?.links ?? []} ctx={ctx} />
                  ) : p.tipo === 'anexos' ? (
                    // Link e arquivo no mesmo campo: o que não tiver, some na leitura.
                    <div className="space-y-3">
                      {ctx.podeEditar || respostas[p.id]?.links?.length ? (
                        <Links pergunta={p} inicial={respostas[p.id]?.links ?? []} ctx={ctx} />
                      ) : null}
                      {ctx.podeEditar || respostas[p.id]?.arquivos?.length ? (
                        <Arquivos pergunta={p} inicial={respostas[p.id]?.arquivos ?? []} ctx={ctx} />
                      ) : null}
                      {!ctx.podeEditar && !respostas[p.id]?.links?.length && !respostas[p.id]?.arquivos?.length ? (
                        <p className="text-texto-suave">Nada adicionado.</p>
                      ) : null}
                    </div>
                  ) : p.tipo === 'tarefas' ? (
                    <ProximosPassos mentoradaId={mentoradaId} previa={Boolean(previa)} lendo={!podeEditar} />
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

type Ctx = { mentoradaId: string; podeEditar: boolean; aoSalvar?: () => void; previa?: boolean; envioId?: string };

async function salvar(
  ctx: Ctx,
  perguntaId: string,
  valor: { texto?: string; opcoes?: string[]; links?: string[]; linhas?: string[][] },
): Promise<boolean> {
  if (ctx.previa) return true;
  const r = await fetch('/api/tutorias/respostas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mentorada: ctx.mentoradaId, perguntaId, envioId: ctx.envioId, ...valor }),
  });
  if (r.ok) ctx.aoSalvar?.();
  return r.ok;
}

function CampoTexto({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: string; ctx: Ctx }) {
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');

  if (!ctx.podeEditar) {
    if (!inicial) return <p className="text-texto-suave">Sem resposta.</p>;
    const linhas = inicial.split('\n').map((l) => l.trim()).filter(Boolean);
    // Campo de "um por linha" (pontos, cuidados, ações): lido como lista.
    return /uma? por linha/i.test(pergunta.ajuda ?? '') && linhas.length > 1 ? (
      <ul className="list-disc space-y-1 pl-5">
        {linhas.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    ) : (
      <p className="whitespace-pre-line">{inicial}</p>
    );
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
    if (!lista?.length || ctx.previa) return;
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
      if (ctx.envioId) form.append('envio', ctx.envioId);
      const r = await fetch('/api/tutorias/arquivos', { method: 'POST', body: form });
      if (!r.ok) {
        setEstado(r.status === 413 ? 'grande' : 'erro');
        return;
      }
      const { anexo } = (await r.json()) as { anexo: Anexo };
      setAnexos((atual) => [...atual, anexo]);
      ctx.aoSalvar?.();
    }
    setEstado('parado');
  };

  const remover = async (a: Anexo) => {
    const r = await fetch('/api/tutorias/arquivos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: ctx.mentoradaId, perguntaId: pergunta.id, caminho: a.caminho, envioId: ctx.envioId }),
    });
    if (r.ok) {
      setAnexos((atual) => atual.filter((x) => x.caminho !== a.caminho));
      ctx.aoSalvar?.();
    }
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

/** Material complementar: links (PDF, Google Docs, Spotify…), quantos quiser. */
function Links({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: string[]; ctx: Ctx }) {
  const [links, setLinks] = useState(inicial);
  const [novo, setNovo] = useState('');
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'erro' | 'invalido'>('parado');

  const gravar = async (lista: string[]) => {
    setEstado('salvando');
    if (await salvar(ctx, pergunta.id, { links: lista })) {
      setLinks(lista);
      setEstado('parado');
      return true;
    }
    setEstado('erro');
    return false;
  };

  const adicionar = async () => {
    const url = novo.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setEstado('invalido');
      return;
    }
    if (await gravar([...links, url])) setNovo('');
  };

  return (
    <div className="space-y-2">
      {links.length ? (
        <ul className="space-y-1.5">
          {links.map((l) => (
            <li key={l} className="group flex items-center gap-2 rounded-lg border border-borda bg-superficie px-3 py-2">
              <ExternalLink aria-hidden size={14} className="shrink-0 text-texto-suave" />
              <a href={l} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-marca underline-offset-2 hover:underline">
                {nomeDoLink(l)}
              </a>
              {ctx.podeEditar ? (
                <button
                  type="button"
                  onClick={() => gravar(links.filter((x) => x !== l))}
                  aria-label="Tirar o link"
                  className="shrink-0 rounded p-0.5 text-texto-suave opacity-0 transition group-hover:opacity-100 hover:text-parado focus:opacity-100"
                >
                  <X aria-hidden size={13} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !ctx.podeEditar ? (
        <p className="text-texto-suave">Nenhum material.</p>
      ) : null}

      {ctx.podeEditar ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={novo}
            onChange={(e) => {
              setNovo(e.target.value);
              if (estado === 'invalido') setEstado('parado');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void adicionar();
              }
            }}
            // A ajuda da pergunta diz que link é esperado ("Cole o link do mapa mental…").
            placeholder={pergunta.ajuda?.replace(/\.$/, '') || 'Cole o link (PDF, Google Docs, Spotify…)'}
            className="min-w-0 flex-1 rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
          />
          <button
            type="button"
            onClick={adicionar}
            disabled={estado === 'salvando' || !novo.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-borda px-3 py-2 text-xs font-medium transition hover:border-marca hover:text-marca disabled:opacity-50"
          >
            <Plus aria-hidden size={13} />
            Adicionar
          </button>
        </div>
      ) : null}
      {estado === 'invalido' ? <p className="text-xs text-parado">Cole um endereço que comece com https://</p> : null}
      {estado === 'erro' ? <p className="text-xs text-parado">Não salvou. Tente de novo.</p> : null}
    </div>
  );
}

/** "docs.google.com/…" em vez do endereço inteiro. */
function nomeDoLink(url: string): string {
  try {
    const u = new URL(url);
    const caminho = decodeURIComponent(u.pathname).split('/').filter(Boolean).at(-1);
    return caminho && /\.[a-z0-9]{2,5}$/i.test(caminho) ? caminho : `${u.hostname.replace(/^www\./, '')}${u.pathname.length > 1 ? '/…' : ''}`;
  } catch {
    return url;
  }
}

/** Próximos passos: as Tarefas da mentoria, da mesma base da página da mentorada. */
function ProximosPassos({ mentoradaId, previa, lendo }: { mentoradaId: string; previa: boolean; lendo: boolean }) {
  const [dados, setDados] = useState<{ tarefas: Tarefa[] | null; podeMexer: boolean; podeAdicionar: boolean } | null>(null);
  const [erro, setErro] = useState(false);

  const buscar = useCallback(async () => {
    const r = await fetch(`/api/tutorias/tarefas?mentorada=${encodeURIComponent(mentoradaId)}`);
    if (!r.ok) throw new Error('falhou');
    return (await r.json()) as { tarefas: Tarefa[] | null; podeMexer: boolean; podeAdicionar: boolean };
  }, [mentoradaId]);

  useEffect(() => {
    if (previa) return;
    let vivo = true;
    buscar()
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [buscar, previa]);

  if (previa) return <p className="text-texto-suave">Aqui aparecem as Tarefas da mentoria de cada mentorada.</p>;
  if (erro) return <p className="text-parado">Não foi possível carregar as tarefas agora.</p>;
  if (!dados) {
    return (
      <p className="flex items-center gap-2 text-texto-suave">
        <Loader2 aria-hidden size={14} className="animate-spin" />
        Carregando tarefas…
      </p>
    );
  }
  if (!dados.tarefas) return <p className="text-texto-suave">Esta mentorada ainda não tem a base de tarefas.</p>;

  return (
    <Tarefas
      mentoradaId={mentoradaId}
      tarefas={dados.tarefas}
      somenteLeitura={!dados.podeMexer}
      semBotaoAdicionar
      aoMudar={() => {
        void buscar().then(setDados).catch(() => setErro(true));
      }}
      adicionarEmLinha={
        // Numa tutoria já salva só se lê: a linha de adicionar aparece ao preencher.
        dados.podeAdicionar && !lendo
          ? async (nova) => {
              const r = await fetch('/api/tutorias/tarefas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mentorada: mentoradaId, ...nova }),
              });
              if (!r.ok) return false;
              await buscar().then(setDados).catch(() => setErro(true));
              return true;
            }
          : undefined
      }
    />
  );
}

/**
 * Tabela (ex.: a Carteira de investimentos): as colunas vêm do modelo. Cada
 * célula salva ao sair dela; linha nova se escreve embaixo, como nas tarefas.
 */
function Tabela({ pergunta, inicial, ctx }: { pergunta: Pergunta; inicial: string[][]; ctx: Ctx }) {
  const colunas = pergunta.opcoes;
  const [linhas, setLinhas] = useState(inicial);
  const [nova, setNova] = useState<string[]>(() => colunas.map(() => ''));
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'erro'>('parado');

  const gravar = async (lista: string[][]) => {
    setEstado('salvando');
    const ok = await salvar(ctx, pergunta.id, { linhas: lista });
    setEstado(ok ? 'parado' : 'erro');
    return ok;
  };

  const mudarCelula = (i: number, j: number, valor: string) =>
    setLinhas((atual) => atual.map((l, li) => (li === i ? l.map((c, cj) => (cj === j ? valor : c)) : l)));

  const adicionar = async () => {
    if (!nova.some((c) => c.trim())) return;
    const lista = [...linhas, nova];
    setLinhas(lista);
    if (await gravar(lista)) setNova(colunas.map(() => ''));
  };

  const celula =
    'w-full min-w-24 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-texto-suave focus:border-borda focus:bg-superficie';

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {colunas.map((c) => (
                <th key={c} className="px-3 py-2 text-[11px] font-medium whitespace-nowrap text-texto-suave">
                  {c}
                </th>
              ))}
              {ctx.podeEditar ? <th className="w-8" /> : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="group border-b border-borda/60 last:border-0">
                {colunas.map((_, j) =>
                  ctx.podeEditar ? (
                    <td key={j} className="px-1 py-1">
                      <input
                        value={l[j] ?? ''}
                        onChange={(e) => mudarCelula(i, j, e.target.value)}
                        onBlur={() => gravar(linhas)}
                        aria-label={`${colunas[j]}, linha ${i + 1}`}
                        className={celula}
                      />
                    </td>
                  ) : (
                    <td key={j} className="px-3 py-2">
                      {l[j]}
                    </td>
                  ),
                )}
                {ctx.podeEditar ? (
                  <td className="px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const lista = linhas.filter((_, li) => li !== i);
                        setLinhas(lista);
                        void gravar(lista);
                      }}
                      aria-label={`Tirar a linha ${i + 1}`}
                      className="rounded p-1 text-texto-suave opacity-0 transition group-hover:opacity-100 hover:text-parado focus:opacity-100"
                    >
                      <X aria-hidden size={13} />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {!ctx.podeEditar && linhas.length === 0 ? (
              // Vazia: a tabela aparece mesmo assim, com uma linha em branco.
              <tr>
                {colunas.map((c) => (
                  <td key={c} className="px-3 py-3" />
                ))}
              </tr>
            ) : null}
            {ctx.podeEditar ? (
              <tr className="border-t border-borda bg-superficie-2/40">
                {colunas.map((c, j) => (
                  <td key={c} className="px-1 py-1">
                    <input
                      value={nova[j]}
                      onChange={(e) => setNova((atual) => atual.map((v, vj) => (vj === j ? e.target.value : v)))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void adicionar();
                        }
                      }}
                      placeholder="Edite aqui"
                      aria-label={`${c}, linha nova`}
                      className={celula}
                    />
                  </td>
                ))}
                <td className="px-1">
                  <button
                    type="button"
                    onClick={adicionar}
                    disabled={!nova.some((c) => c.trim())}
                    aria-label="Adicionar linha"
                    className="flex size-6 items-center justify-center rounded-md border border-dashed border-borda text-texto-suave transition hover:border-marca hover:text-marca disabled:opacity-40"
                  >
                    <Plus aria-hidden size={12} />
                  </button>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {estado === 'erro' ? <p className="text-xs text-parado">Não salvou. Tente de novo.</p> : null}
    </div>
  );
}
