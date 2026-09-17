'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Loader2, X } from 'lucide-react';
import type { ConteudoDaSessao, SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import type { TarefaDaMentoria } from '@/lib/notion/tarefas';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { Etiqueta } from '@/components/Etiqueta';

type Detalhe = { conteudo: ConteudoDaSessao; tarefas: TarefaDaMentoria[] | null };

const buscas = new Map<string, Promise<Detalhe>>();
function buscarSessao(id: string, mentoradaId: string): Promise<Detalhe> {
  const chave = `${mentoradaId}:${id}`;
  let busca = buscas.get(chave);
  if (!busca) {
    busca = fetch(`/api/sessoes/${id}?mentorada=${encodeURIComponent(mentoradaId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falhou'))))
      .then((j: Detalhe) => j);
    busca.catch(() => buscas.delete(chave));
    buscas.set(chave, busca);
  }
  return busca;
}

const dataCurta = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

const FILTROS = [
  { chave: 'todas', rotulo: 'Todas' },
  { chave: 'realizadas', rotulo: 'Realizadas' },
  { chave: 'arealizar', rotulo: 'A realizar' },
] as const;

/** Lista das sessões, só para ver; cada sessão abre num cartão por cima da página. */
export function ListaDeSessoes({ mentoradaId, sessoes }: { mentoradaId: string; sessoes: SessaoDaLista[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['chave']>('todas');
  const [aberta, setAberta] = useState<SessaoDaLista | null>(null);

  const visiveis = sessoes.filter((s) =>
    filtro === 'todas' ? true : filtro === 'realizadas' ? s.realizada : !s.realizada,
  );

  return (
    <div>
      <div role="tablist" aria-label="Filtrar sessões" className="mb-3 flex gap-1">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            type="button"
            role="tab"
            aria-selected={filtro === f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              filtro === f.chave ? 'bg-marca font-medium text-marca-contraste' : 'text-texto-suave hover:bg-fundo hover:text-texto'
            }`}
          >
            {f.rotulo}
            <span className="ml-1.5 tabular-nums opacity-70">
              {f.chave === 'todas'
                ? sessoes.length
                : sessoes.filter((s) => (f.chave === 'realizadas' ? s.realizada : !s.realizada)).length}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {['Status', 'Sessão', 'Data', 'Tutora', ''].map((c, i) => (
                <th key={i} className="px-4 py-2.5 text-[11px] font-medium whitespace-nowrap text-texto-suave">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-texto-suave">
                  Nenhuma sessão aqui.
                </td>
              </tr>
            ) : (
              visiveis.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setAberta(s)}
                  onMouseEnter={() => void buscarSessao(s.id, mentoradaId).catch(() => {})}
                  className="cursor-pointer border-b border-borda/60 transition last:border-0 hover:bg-fundo"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">{s.status ? <Etiqueta texto={s.status} /> : null}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <button type="button" onClick={() => setAberta(s)} className="text-left hover:text-marca">
                      {s.sessao}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">{dataCurta(s.data)}</td>
                  <td className="px-4 py-2.5 text-texto-suave">{s.tutoras.join(', ') || '—'}</td>
                  <td className="w-8 px-2 text-texto-suave">
                    <ChevronRight aria-hidden size={14} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {aberta ? <CartaoSessao sessao={aberta} mentoradaId={mentoradaId} aoFechar={() => setAberta(null)} /> : null}
    </div>
  );
}

function CartaoSessao({
  sessao,
  mentoradaId,
  aoFechar,
}: {
  sessao: SessaoDaLista;
  mentoradaId: string;
  aoFechar: () => void;
}) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    buscarSessao(sessao.id, mentoradaId)
      .then((d) => vivo && setDetalhe(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [sessao.id, mentoradaId]);

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
    <div role="dialog" aria-modal="true" aria-label={sessao.sessao} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]" />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="display text-xl leading-tight">{sessao.sessao}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-suave">
              {sessao.status ? <Etiqueta texto={sessao.status} /> : null}
              <span className="tabular-nums">{dataCurta(sessao.data)}</span>
              {sessao.tutoras.length ? <span>· {sessao.tutoras.join(', ')}</span> : null}
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {!detalhe && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar esta sessão agora.</p> : null}

          {detalhe ? (
            <>
              <Parte titulo="Resumo da sessão" blocos={detalhe.conteudo.resumo} />
              <Parte titulo="Anotações" blocos={detalhe.conteudo.anotacoes} />

              <details className="group rounded-xl border border-borda">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
                  <ChevronRight aria-hidden size={14} className="text-texto-suave transition-transform group-open:rotate-90" />
                  Transcrição da sessão
                </summary>
                <div className="border-t border-borda px-4 py-3">
                  {temTexto(detalhe.conteudo.transcricao) ? (
                    <BlocosNotion blocos={detalhe.conteudo.transcricao} />
                  ) : (
                    <p className="text-sm text-texto-suave">Sem transcrição.</p>
                  )}
                </div>
              </details>

              <section className="rounded-xl border border-borda px-4 py-3">
                <h3 className="mb-2 text-sm font-medium">Tarefas</h3>
                {detalhe.tarefas && detalhe.tarefas.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {detalhe.tarefas.map((t) => (
                      <li key={t.id} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            t.feita ? 'border-marca bg-marca text-marca-contraste' : 'border-borda'
                          }`}
                        >
                          {t.feita ? '✓' : ''}
                        </span>
                        <span className={t.feita ? 'text-texto-suave line-through' : ''}>{t.tarefa}</span>
                        {t.prazo ? <span className="ml-auto shrink-0 text-xs text-texto-suave tabular-nums">{dataCurta(t.prazo)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-texto-suave">Nenhuma tarefa.</p>
                )}
              </section>

              <section className="rounded-xl border border-borda px-4 py-3">
                <h3 className="mb-2 text-sm font-medium">Gravação</h3>
                <Gravacao url={detalhe.conteudo.gravacao} />
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function temTexto(blocos: BlocoSimples[]): boolean {
  return blocos.some((b) => Boolean(b.texto.trim() || b.url) || temTexto(b.filhos));
}

function Parte({ titulo, blocos }: { titulo: string; blocos: BlocoSimples[] }) {
  return (
    <section className="rounded-xl border border-borda px-4 py-3">
      <h3 className="mb-2 text-sm font-medium">{titulo}</h3>
      {temTexto(blocos) ? <BlocosNotion blocos={blocos} /> : <p className="text-sm text-texto-suave">Ainda não preenchido.</p>}
    </section>
  );
}

/** YouTube, Vimeo e Loom viram player embutido; arquivo enviado ao Notion toca direto; o resto vira link. */
function Gravacao({ url }: { url: string | null }) {
  if (!url) return <p className="text-sm text-texto-suave">Sem gravação.</p>;

  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  const embed = youtube
    ? `https://www.youtube.com/embed/${youtube[1]}`
    : vimeo
      ? `https://player.vimeo.com/video/${vimeo[1]}`
      : loom
        ? `https://www.loom.com/embed/${loom[1]}`
        : null;

  if (embed) {
    return (
      <div className="aspect-video overflow-hidden rounded-lg bg-superficie-2">
        <iframe src={embed} title="Gravação da sessão" allow="fullscreen; picture-in-picture" allowFullScreen className="size-full" />
      </div>
    );
  }
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || url.includes('prod-files-secure') || url.includes('amazonaws.com')) {
    return <video src={url} controls className="w-full rounded-lg" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-sm text-marca underline underline-offset-2">
      Abrir gravação
    </a>
  );
}
