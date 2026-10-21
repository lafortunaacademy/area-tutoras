'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Info, Loader2, Upload, X } from 'lucide-react';
import type { ConteudoDaSessao, ParteDaSessao, SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { ProximosPassos } from '@/components/tutorias/FormularioDoApp';
import { TutorasDaSessao } from './FotoDaTutora';

type Detalhe = { conteudo: ConteudoDaSessao; podeEditar?: boolean };

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

export const dataCurta = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

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
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-borda text-left">
              {['Status', 'Sessão', 'Data', 'Tutora', ''].map((c, i) => (
                <th key={i} className="px-4 py-1.5 text-[11px] font-medium whitespace-nowrap text-texto-suave">
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
                  <td className="px-4 py-1 whitespace-nowrap">{s.status ? <EtiquetaNotion texto={s.status} cor={s.corStatus} /> : null}</td>
                  <td className="px-4 py-1 font-medium">
                    <button type="button" onClick={() => setAberta(s)} className="text-left hover:text-marca">
                      {s.sessao}
                    </button>
                  </td>
                  <td className="px-4 py-1 whitespace-nowrap text-texto-suave tabular-nums">{dataCurta(s.data)}</td>
                  <td className="px-4 py-1 text-texto-suave">
                    <TutorasDaSessao equipe={s.equipe} nomes={s.tutoras} />
                  </td>
                  <td className="w-8 px-2 py-1 text-texto-suave">
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

export function CartaoSessao({
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

  const podeMexer = (parte: ParteDaSessao) => Boolean(detalhe?.podeEditar && detalhe.conteudo.editaveis?.includes(parte));

  /** Grava a parte e guarda o conteúdo novo, inclusive na memória das sessões já abertas. */
  async function salvarParte(parte: ParteDaSessao, valor: string | File): Promise<string | null> {
    let body: BodyInit;
    let headers: HeadersInit | undefined;
    if (typeof valor === 'string') {
      body = JSON.stringify({ parte, valor });
      headers = { 'Content-Type': 'application/json' };
    } else {
      const form = new FormData();
      form.append('parte', parte);
      form.append('arquivo', valor);
      body = form;
    }
    const r = await fetch(`/api/sessoes/${sessao.id}?mentorada=${encodeURIComponent(mentoradaId)}`, {
      method: 'PATCH',
      headers,
      body,
    }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (!r?.ok) return j?.erro ?? 'Não foi possível salvar agora.';
    setDetalhe((d) => {
      if (!d) return d;
      const novo = { ...d, conteudo: j.conteudo as ConteudoDaSessao };
      buscas.set(`${mentoradaId}:${sessao.id}`, Promise.resolve(novo));
      return novo;
    });
    return null;
  }

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
              {sessao.status ? <EtiquetaNotion texto={sessao.status} cor={sessao.corStatus} /> : null}
              <span className="tabular-nums">{dataCurta(sessao.data)}</span>
              {sessao.equipe?.length || sessao.tutoras.length ? (
                <span className="flex items-center gap-1.5">
                  · <TutorasDaSessao equipe={sessao.equipe} nomes={sessao.tutoras} />
                </span>
              ) : null}
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
              {(
                [
                  ['resumo', 'Resumo da sessão'],
                  ['anotacoes', 'Anotações'],
                ] as const
              ).map(([parte, titulo]) => (
                <Parte
                  key={parte}
                  titulo={titulo}
                  blocos={detalhe.conteudo[parte]}
                  aoSalvar={podeMexer(parte) ? (v) => salvarParte(parte, v) : undefined}
                />
              ))}

              <details className="group rounded-xl border border-borda">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
                  <ChevronRight aria-hidden size={14} className="text-texto-suave transition-transform group-open:rotate-90" />
                  Transcrição da sessão
                </summary>
                <div className="border-t border-borda px-4 py-3">
                  <Editavel
                    inicial={paraTexto(detalhe.conteudo.transcricao)}
                    aoSalvar={podeMexer('transcricao') ? (v) => salvarParte('transcricao', v) : undefined}
                  >
                    {temTexto(detalhe.conteudo.transcricao) ? (
                      <BlocosNotion blocos={detalhe.conteudo.transcricao} />
                    ) : (
                      <p className="text-sm text-texto-suave">Sem transcrição.</p>
                    )}
                  </Editavel>
                </div>
              </details>

              <section className="rounded-xl border border-borda px-4 py-3">
                <h3 className="mb-2 text-sm font-medium">Tarefas</h3>
                <div className="text-sm">
                  <ProximosPassos mentoradaId={mentoradaId} previa={false} lendo={!detalhe.podeEditar} />
                </div>
              </section>

              <section className="rounded-xl border border-borda px-4 py-3">
                <h3 className="mb-2 text-sm font-medium">Gravação</h3>
                <Gravacao url={detalhe.conteudo.gravacao} />
                {podeMexer('gravacao') ? (
                  <EditarGravacao temVideo={Boolean(detalhe.conteudo.gravacao)} aoSalvar={(v) => salvarParte('gravacao', v)} />
                ) : null}
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

/** Texto de uma parte para editar: uma linha por bloco, tópicos com "- ". */
function paraTexto(blocos: BlocoSimples[]): string {
  return blocos.map((b) => (b.tipo === 'bulleted_list_item' ? `- ${b.texto}` : b.texto)).join('\n');
}

function Parte({
  titulo,
  blocos,
  aoSalvar,
}: {
  titulo: string;
  blocos: BlocoSimples[];
  aoSalvar?: (valor: string) => Promise<string | null>;
}) {
  return (
    <section className="rounded-xl border border-borda px-4 py-3">
      <h3 className="mb-2 text-sm font-medium">{titulo}</h3>
      <Editavel inicial={paraTexto(blocos)} aoSalvar={aoSalvar}>
        {temTexto(blocos) ? <BlocosNotion blocos={blocos} /> : <p className="text-sm text-texto-suave">Ainda não preenchido.</p>}
      </Editavel>
    </section>
  );
}

/**
 * Quem pode editar vê a caixa já aberta, com o texto; grava sozinho ao sair do
 * campo. Sem `aoSalvar`, só mostra o conteúdo.
 */
function Editavel({
  inicial,
  aoSalvar,
  children,
}: {
  inicial: string;
  aoSalvar?: (valor: string) => Promise<string | null>;
  children: React.ReactNode;
}) {
  const [valor, setValor] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [estado, setEstado] = useState<'parado' | 'salvando' | 'salvo'>('parado');
  const [erro, setErro] = useState<string | null>(null);

  if (!aoSalvar) return <>{children}</>;

  async function salvar() {
    if (valor === salvo) return;
    setEstado('salvando');
    setErro(null);
    const falha = await aoSalvar!(valor);
    if (falha) {
      setErro(falha);
      setEstado('parado');
    } else {
      setSalvo(valor);
      setEstado('salvo');
    }
  }

  return (
    <div>
      <textarea
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          setEstado('parado');
        }}
        onBlur={() => void salvar()}
        rows={Math.min(Math.max(valor.split('\n').length + 1, 3), 16)}
        placeholder="Edite aqui"
        className="w-full resize-y rounded-lg border border-borda bg-fundo px-3 py-2 text-sm leading-relaxed outline-none focus:border-marca"
      />
      <p className="mt-1 h-4 text-[11px] text-texto-suave">
        {erro ? (
          <span className="text-parado">{erro}</span>
        ) : estado === 'salvando' ? (
          'Salvando…'
        ) : estado === 'salvo' ? (
          'Salvo'
        ) : valor !== salvo ? (
          'Salva ao sair do campo. Comece a linha com - para tópico.'
        ) : null}
      </p>
    </div>
  );
}

/** Até onde o app consegue enviar um vídeo (o mesmo limite do servidor). */
const LIMITE_DO_VIDEO_MB = 4;

/** Sempre aberto: link (Drive, YouTube…) ou, para vídeos curtos, o arquivo. Grava no lugar do vídeo que houver. */
function EditarGravacao({ temVideo, aoSalvar }: { temVideo: boolean; aoSalvar: (v: string | File) => Promise<string | null> }) {
  const [link, setLink] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  async function enviar(valor: string | File) {
    if (valor instanceof File && valor.size > LIMITE_DO_VIDEO_MB * 1024 * 1024) {
      setErro(`Esse vídeo passa de ${LIMITE_DO_VIDEO_MB} MB. Coloque no Drive ou no YouTube e cole o link.`);
      return;
    }
    setSalvando(true);
    setErro(null);
    const falha = await aoSalvar(valor);
    setSalvando(false);
    if (falha) setErro(falha);
    else setLink('');
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="flex gap-2 rounded-lg bg-marca-suave/60 px-3 py-2 text-xs leading-relaxed text-texto-suave">
        <Info aria-hidden size={14} className="mt-0.5 shrink-0" />
        <span>
          O ideal é que o vídeo esteja numa pasta do Google Drive ou salvo no YouTube (pode ser como não listado): é só
          colar o link abaixo. Arquivo enviado por aqui tem limite de {LIMITE_DO_VIDEO_MB} MB.
        </span>
      </p>
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && link.trim()) void enviar(link);
        }}
        placeholder={temVideo ? 'Cole aqui um link novo para trocar a gravação' : 'Cole aqui o link da gravação'}
        className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
      />
      {erro ? <p className="text-xs text-parado">{erro}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void enviar(link)}
          disabled={salvando || !link.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? <Loader2 aria-hidden size={12} className="animate-spin" /> : null}
          Salvar link
        </button>
        <button
          type="button"
          onClick={() => arquivo.current?.click()}
          disabled={salvando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs text-texto-suave transition hover:bg-superficie-2 hover:text-texto disabled:opacity-60"
        >
          <Upload aria-hidden size={12} />
          Enviar arquivo (até {LIMITE_DO_VIDEO_MB} MB)
        </button>
        <input
          ref={arquivo}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void enviar(f);
          }}
        />
        {temVideo ? (
          <button
            type="button"
            onClick={() => void enviar('')}
            disabled={salvando}
            className="rounded-lg px-3 py-1.5 text-xs text-texto-suave transition hover:bg-superficie-2 hover:text-parado"
          >
            Tirar gravação
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** YouTube, Vimeo e Loom viram player embutido; arquivo enviado ao Notion toca direto; o resto vira link. */
function Gravacao({ url }: { url: string | null }) {
  if (!url) return <p className="text-sm text-texto-suave">Sem gravação.</p>;

  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  const embed = youtube
    ? `https://www.youtube.com/embed/${youtube[1]}`
    : vimeo
      ? `https://player.vimeo.com/video/${vimeo[1]}`
      : loom
        ? `https://www.loom.com/embed/${loom[1]}`
        : drive
          ? `https://drive.google.com/file/d/${drive[1]}/preview`
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
