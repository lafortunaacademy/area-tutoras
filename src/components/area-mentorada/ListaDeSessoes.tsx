'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronRight, FileText, Info, Link2, Loader2, Upload, X } from 'lucide-react';
import type { SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { EtiquetaSessao } from './EtiquetaSessao';
import { ProximosPassos, buscarTarefas } from '@/components/tutorias/FormularioDoApp';
import { Tela } from './MateriaisDaTutoria';
import { FormularioPreSessao } from './FormularioPreSessao';
import { TutorasDaSessao } from './FotoDaTutora';

/** A sessão como ela está no Notion: os blocos da página do modelo escolhido. */
type Detalhe = { sessao: SessaoDaLista; blocos: BlocoSimples[]; podeEditar?: boolean };

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

/** O nome da sessão; sem título na página, vale a propriedade "Sessão " (o tipo). */
const nomeDaSessao = (s: SessaoDaLista) => s.sessao || s.tipo || '—';

/**
 * A coluna "Sessão": o tipo como etiqueta e, ao lado, o título da página —
 * só quando ele diz outra coisa ("Tutoria 01 | Produto" ao lado de "Tutoria").
 */
export function NomeDaSessao({ sessao }: { sessao: SessaoDaLista }) {
  if (!sessao.tipo) return <>{sessao.sessao || '—'}</>;
  const titulo = sessao.sessao.trim();
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <EtiquetaSessao tipo={sessao.tipo} cor={sessao.corTipo} />
      {titulo && titulo.toLowerCase() !== sessao.tipo.trim().toLowerCase() ? <span>{titulo}</span> : null}
    </span>
  );
}

/** Os IDs do Notion andam com e sem traço; aqui todos viram a mesma coisa. */
const mesmoId = (a?: string | null, b?: string | null) =>
  Boolean(a && b) && a!.replace(/-/g, '') === b!.replace(/-/g, '');

export const dataCurta = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');


/** Lista das sessões, só para ver; cada sessão abre num cartão por cima da página. */
export function ListaDeSessoes({ mentoradaId, sessoes }: { mentoradaId: string; sessoes: SessaoDaLista[] }) {
  // Link direto (?sessao=…&pagina=…): a sessão já abre, e a página de dentro
  // junto — é o link que a equipe manda para a mentorada preencher.
  const endereco = useSearchParams();
  const pedida = endereco.get('sessao');
  const paginaPedida = endereco.get('pagina');

  const [aberta, setAberta] = useState<SessaoDaLista | null>(
    () => sessoes.find((s) => mesmoId(s.id, pedida)) ?? null,
  );

  // Sem filtro de status: a etiqueta de cada linha já diz o que foi realizado.
  const visiveis = sessoes;

  return (
    <div>
      {/* No celular cada sessão é um botão: linha de tabela não abre no toque. */}
      <ul className="space-y-2 sm:hidden">
        {visiveis.length === 0 ? (
          <li className="rounded-xl border border-borda px-4 py-6 text-center text-sm text-texto-suave">Nenhuma sessão aqui.</li>
        ) : (
          visiveis.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setAberta(s)}
                className="flex w-full items-start gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 text-left transition active:bg-fundo"
              >
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-sm leading-snug font-medium">
                    <NomeDaSessao sessao={s} />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-texto-suave">
                    {s.status ? <EtiquetaNotion texto={s.status} cor={s.corStatus} /> : null}
                    <span className="tabular-nums">{dataCurta(s.data)}</span>
                  </span>
                  <span className="block text-[11px] text-texto-suave">
                    <TutorasDaSessao equipe={s.equipe} nomes={s.tutoras} />
                  </span>
                </span>
                <ChevronRight aria-hidden size={16} className="mt-0.5 shrink-0 text-texto-suave" />
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-borda sm:block">
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
                  // Altura fixa: linha com etiqueta, foto ou "—" fica do mesmo tamanho.
                  className="h-10 cursor-pointer border-b border-borda/60 transition last:border-0 hover:bg-fundo"
                >
                  <td className="px-4 py-1 whitespace-nowrap">{s.status ? <EtiquetaNotion texto={s.status} cor={s.corStatus} /> : null}</td>
                  <td className="px-4 py-1 font-medium">
                    <button type="button" onClick={() => setAberta(s)} className="text-left hover:text-marca">
                      <NomeDaSessao sessao={s} />
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

      {aberta ? (
        <CartaoSessao
          sessao={aberta}
          mentoradaId={mentoradaId}
          paginaAberta={mesmoId(aberta.id, pedida) ? paginaPedida : null}
          aoFechar={() => setAberta(null)}
        />
      ) : null}
    </div>
  );
}

export function CartaoSessao({
  sessao,
  mentoradaId,
  paginaAberta,
  aoFechar,
}: {
  sessao: SessaoDaLista;
  mentoradaId: string;
  /** Página de dentro que já abre junto (o link direto da pré-sessão). */
  paginaAberta?: string | null;
  aoFechar: () => void;
}) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    // As tarefas são sempre as mesmas da mentorada: busca junto, não depois
    // que a sessão chega — assim as duas esperas acontecem ao mesmo tempo.
    void buscarTarefas(mentoradaId).catch(() => {});
    buscarSessao(sessao.id, mentoradaId)
      .then((d) => vivo && setDetalhe(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [sessao.id, mentoradaId]);

  const endereco = `/api/sessoes/${sessao.id}?mentorada=${encodeURIComponent(mentoradaId)}`;

  /** O conteúdo mudou no Notion: a próxima abertura busca de novo. */
  function esquecer() {
    buscas.delete(`${mentoradaId}:${sessao.id}`);
  }

  /** A gravação troca o vídeo da página inteira, então tem caminho próprio. */
  async function salvarGravacao(valor: string | File): Promise<string | null> {
    let body: BodyInit;
    let headers: HeadersInit | undefined;
    if (typeof valor === 'string') {
      body = JSON.stringify({ parte: 'gravacao', valor });
      headers = { 'Content-Type': 'application/json' };
    } else {
      const form = new FormData();
      form.append('parte', 'gravacao');
      form.append('arquivo', valor);
      body = form;
    }
    const r = await fetch(endereco, { method: 'PATCH', headers, body }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (!r?.ok) return j?.erro ?? 'Não foi possível salvar agora.';

    esquecer();
    const novo = await buscarSessao(sessao.id, mentoradaId).catch(() => null);
    if (novo) setDetalhe(novo);
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
    <div role="dialog" aria-modal="true" aria-label={nomeDaSessao(sessao)} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-8">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]" />

      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-start gap-4 border-b border-borda px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="display text-xl leading-tight">{nomeDaSessao(sessao)}</p>
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
            <ConteudoDaSessao
              detalhe={detalhe}
              mentoradaId={mentoradaId}
              sessaoId={sessao.id}
              paginaAberta={paginaAberta}
              endereco={endereco}
              aoSalvar={esquecer}
              salvarGravacao={salvarGravacao}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A pergunta "Tarefas" da página vira a base de tarefas da mentorada. */
const ehTarefas = (b: BlocoSimples) => /^(tarefas|pr[óo]ximos passos)/i.test(b.texto.trim());
/** E a pergunta "Gravação" vira o player, com link ou arquivo para quem edita. */
const ehGravacao = (b: BlocoSimples) => /^grava[çc][ãa]o/i.test(b.texto.trim());

/**
 * O que a sessão tem dentro.
 *
 * Cada sessão nasce de um modelo no Notion (Terapêutica, Investimentos,
 * Produto…), então aqui não há campos fixos: o app desenha o que estiver na
 * página e deixa preencher. Só duas partes têm tratamento próprio — as tarefas,
 * que moram na base da mentorada, e a gravação.
 */
function ConteudoDaSessao({
  detalhe,
  mentoradaId,
  sessaoId,
  paginaAberta,
  endereco,
  aoSalvar,
  salvarGravacao,
}: {
  detalhe: Detalhe;
  mentoradaId: string;
  sessaoId: string;
  paginaAberta?: string | null;
  endereco: string;
  aoSalvar: () => void;
  salvarGravacao: (valor: string | File) => Promise<string | null>;
}) {
  const podeEditar = Boolean(detalhe.podeEditar);

  const gravacao = (b?: BlocoSimples) => (
    <section key={b?.id ?? 'gravacao'} className="rounded-xl border border-borda px-4 py-3">
      <h3 className="mb-2 text-sm font-medium">{b?.texto || 'Gravação'}</h3>
      <Gravacao url={acharVideo(b ? [b] : detalhe.blocos)} />
      {podeEditar ? (
        <EditarGravacao temVideo={Boolean(acharVideo(detalhe.blocos))} aoSalvar={salvarGravacao} />
      ) : null}
    </section>
  );

  const tarefas = (b?: BlocoSimples) => (
    <section key={b?.id ?? 'tarefas'} className="rounded-xl border border-borda px-4 py-3">
      <h3 className="mb-2 text-sm font-medium">{b?.texto || 'Tarefas'}</h3>
      <div className="text-sm">
        <ProximosPassos mentoradaId={mentoradaId} previa={false} lendo={!podeEditar} />
      </div>
    </section>
  );

  const proprio = (b: BlocoSimples) => (ehTarefas(b) ? tarefas(b) : ehGravacao(b) ? gravacao(b) : undefined);

  const paginaFilha = (b: BlocoSimples) => (
    <PaginaDaSessao
      key={b.id}
      bloco={b}
      mentoradaId={mentoradaId}
      sessaoId={sessaoId}
      endereco={endereco}
      podeEditar={podeEditar}
      ciclo={detalhe.sessao.ciclo}
      comecaAberta={mesmoId(b.id, paginaAberta)}
    />
  );

  const temTarefas = detalhe.blocos.some(ehTarefas);
  const temGravacao = detalhe.blocos.some(ehGravacao) || Boolean(acharVideo(detalhe.blocos));

  return (
    <>
      {podeEditar ? (
        <FormularioPreSessao
          blocos={detalhe.blocos}
          materialId=""
          mentoradaId={mentoradaId}
          aoSalvar={aoSalvar}
          endereco={{ url: endereco, metodo: 'PATCH' }}
          pergunta={proprio}
          paginaFilha={paginaFilha}
        />
      ) : (
        detalhe.blocos.map(
          (b) => proprio(b) ?? (b.tipo === 'child_page' ? paginaFilha(b) : <BlocosNotion key={b.id} blocos={[b]} />),
        )
      )}

      {detalhe.blocos.length === 0 ? (
        <p className="text-sm text-texto-suave">Esta sessão ainda não tem conteúdo no Notion.</p>
      ) : null}

      {/* O modelo pode não trazer estas duas; elas valem para toda sessão. */}
      {temTarefas ? null : tarefas()}
      {temGravacao ? null : gravacao()}
    </>
  );
}

/** O primeiro vídeo que aparecer nos blocos — é ele que o player mostra. */
function acharVideo(blocos: BlocoSimples[]): string | null {
  for (const b of blocos) {
    if ((b.tipo === 'video' || b.tipo === 'embed' || b.tipo === 'bookmark' || b.tipo === 'file') && b.url) return b.url;
    const dentro = acharVideo(b.filhos);
    if (dentro) return dentro;
  }
  return null;
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

/**
 * Uma página de dentro da sessão — a pré-sessão, o teste de estilo. Aparece
 * fechada, como no Notion, e abre centralizada com o conteúdo para preencher.
 */
function PaginaDaSessao({
  bloco,
  mentoradaId,
  sessaoId,
  endereco,
  podeEditar,
  ciclo,
  comecaAberta,
}: {
  bloco: BlocoSimples;
  mentoradaId: string;
  sessaoId: string;
  /** A rota da sessão, que é por onde as respostas desta página são gravadas. */
  endereco: string;
  podeEditar: boolean;
  /** Ciclo da sessão, para o link abrir na lista certa. */
  ciclo: string;
  /** Veio pelo link direto: já abre. */
  comecaAberta?: boolean;
}) {
  const [aberta, setAberta] = useState(Boolean(comecaAberta));
  const [dados, setDados] = useState<{ titulo: string; blocos: BlocoSimples[] } | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = () => {
    if (dados) return;
    setErro(false);
    fetch(`/api/sessoes/${sessaoId}/paginas/${bloco.id}?mentorada=${encodeURIComponent(mentoradaId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falhou'))))
      .then(setDados)
      .catch(() => setErro(true));
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onMouseEnter={carregar}
          onFocus={carregar}
          onClick={() => {
            carregar();
            setAberta(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-marca/40 bg-marca-suave/40 px-3 py-2.5 text-left text-sm font-medium text-marca transition hover:border-marca"
        >
          <FileText aria-hidden size={15} className="shrink-0" />
          <span className="min-w-0 flex-1 leading-snug">{bloco.texto || 'Página'}</span>
          <ChevronRight aria-hidden size={14} className="shrink-0" />
        </button>
        <CopiarLink mentoradaId={mentoradaId} sessaoId={sessaoId} paginaId={bloco.id} ciclo={ciclo} />
      </div>

      {aberta ? (
        <Tela titulo={dados?.titulo || bloco.texto} aoFechar={() => setAberta(false)}>
          {!dados && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
          {dados ? (
            podeEditar ? (
              <FormularioPreSessao
                blocos={dados.blocos}
                materialId=""
                mentoradaId={mentoradaId}
                aoSalvar={() => {}}
                endereco={{ url: endereco, metodo: 'PATCH' }}
                base={(b) => <Opcoes itens={b.itens ?? []} />}
              />
            ) : (
              <BlocosNotion blocos={dados.blocos} />
            )
          ) : null}
        </Tela>
      ) : null}
    </>
  );
}

/**
 * As opções de uma base de dentro da página — os looks do teste de estilo.
 *
 * No Notion elas são uma galeria: aqui ficam as capas com o nome embaixo, só
 * para ver. A escolha a mentorada escreve na resposta da pergunta.
 */
function Opcoes({ itens }: { itens: { id: string; titulo: string; capa?: string }[] }) {
  if (itens.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {itens.map((i) => (
        <li key={i.id} className="overflow-hidden rounded-lg border border-borda bg-superficie">
          {i.capa ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagem do Notion, com endereço temporário
            <img src={i.capa} alt="" loading="lazy" decoding="async" className="h-28 w-full object-cover" />
          ) : null}
          <p className="px-2 py-1.5 text-[11px] leading-snug">{i.titulo}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * O link para mandar à mentorada: abre a área dela já com esta página aberta
 * para preencher. Quem entra sem estar logada passa pelo acesso por e-mail e
 * volta para cá.
 */
function CopiarLink({
  mentoradaId,
  sessaoId,
  paginaId,
  ciclo,
}: {
  mentoradaId: string;
  sessaoId: string;
  paginaId: string;
  ciclo: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    const busca = new URLSearchParams({ sessao: sessaoId, pagina: paginaId });
    if (ciclo) busca.set('ciclo', ciclo);
    const endereco = `${window.location.origin}/mentoradas/${mentoradaId}?${busca}#sessoes`;
    await navigator.clipboard.writeText(endereco).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      title="Copiar o link desta página para a mentorada"
      className="shrink-0 rounded-lg border border-borda px-2 py-2 text-texto-suave transition hover:border-marca hover:text-marca"
    >
      {copiado ? <Check aria-hidden size={14} /> : <Link2 aria-hidden size={14} />}
      <span className="sr-only">Copiar link para a mentorada</span>
    </button>
  );
}
