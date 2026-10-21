'use client';

import { useState } from 'react';
import { Check, Loader2, Paperclip, Plus } from 'lucide-react';
import type { BlocoSimples } from '@/lib/notion/blocks';
import { BlocosNotion } from '@/components/BlocosNotion';

type Anexar = (calloutId: string, arquivo: File) => Promise<BlocoSimples | 'grande' | null>;

type Salvar = (
  corpo:
    | { acao: 'marcar'; blocoId: string; marcado: boolean }
    | { acao: 'texto' | 'adicionar'; blocoId: string; texto: string }
    | { acao: 'linhaDaTabela'; blocoId: string; celulas: string[] }
    | { acao: 'linha'; blocoId: string },
) => Promise<string | null>;

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
  token,
  aoSalvar,
  base,
  endereco,
  pergunta,
  paginaFilha,
}: {
  blocos: BlocoSimples[];
  materialId: string;
  mentoradaId: string;
  /** Token do link de preenchimento, quando a pessoa entrou por ele em vez de fazer login. */
  token?: string;
  /** Chamado depois de cada gravação, para quem guardou o conteúdo em cache. */
  aoSalvar: () => void;
  /** Como desenhar uma base de dentro do material (as páginas dela). */
  base?: (b: BlocoSimples) => React.ReactNode;
  /**
   * Onde gravar. O padrão é a página de uma tutoria; a sessão usa a rota dela,
   * porque o conteúdo de cada sessão vem do modelo que a equipe escolheu.
   */
  endereco?: { url: string; metodo: 'POST' | 'PATCH' };
  /** Desenho próprio para uma pergunta (as Tarefas, por exemplo). */
  pergunta?: (b: BlocoSimples) => React.ReactNode;
  /** Como desenhar uma página de dentro desta (a pré-sessão de uma tutoria). */
  paginaFilha?: (b: BlocoSimples) => React.ReactNode;
}) {
  const destino = endereco ?? { url: `/api/materiais/${materialId}/respostas`, metodo: 'POST' as const };

  const salvar: Salvar = async (corpo) => {
    const r = await fetch(destino.url, {
      method: destino.metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: mentoradaId, token, ...corpo }),
    });
    if (!r.ok) return null;
    aoSalvar();
    return ((await r.json()) as { id: string }).id;
  };

  // Anexo é coisa de material: a sessão não tem rota de arquivo, e aí o campo
  // de arquivo simplesmente não aparece.
  const anexar: Anexar | undefined = !materialId
    ? undefined
    : async (calloutId, arquivo) => {
        const form = new FormData();
        form.append('mentorada', mentoradaId);
        form.append('bloco', calloutId);
        if (token) form.append('token', token);
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
      {blocos.map(
        (b) =>
          pergunta?.(b) ?? <Bloco key={b.id} bloco={b} salvar={salvar} anexar={anexar} base={base} pagina={paginaFilha} />,
      )}
    </div>
  );
}

const ehPergunta = (t: string) => /[?:]\s*$/.test(t.trim());

const TIPOS_DE_ARQUIVO = new Set(['image', 'file', 'pdf', 'video', 'column_list']);
/** A pergunta pede arquivo: fala em print, foto, anexo… ou já tem arquivo dentro. */
const pedeArquivo = (b: BlocoSimples) =>
  /print|arquivo|anex|foto|imagem|upload|documento|pdf/i.test(b.texto) || b.filhos.some((f) => TIPOS_DE_ARQUIVO.has(f.tipo));

function Bloco({
  bloco,
  salvar,
  anexar,
  base,
  pagina,
}: {
  bloco: BlocoSimples;
  salvar: Salvar;
  anexar?: Anexar;
  base?: (b: BlocoSimples) => React.ReactNode;
  pagina?: (b: BlocoSimples) => React.ReactNode;
}) {
  if (bloco.tipo === 'child_page' && pagina) return <>{pagina(bloco)}</>;
  if (bloco.tipo.startsWith('heading')) {
    return <h3 className="display pt-4 text-lg text-marca first:pt-0">{bloco.texto}</h3>;
  }
  if (bloco.tipo === 'table') return <Tabela tabela={bloco} salvar={salvar} />;
  if (bloco.tipo !== 'callout') return <BlocosNotion blocos={[bloco]} base={base} />;

  // Tabela já é o lugar de escrever: a pergunta não ganha campo de texto a mais.
  // Pergunta que já tem como responder — inclusive a galeria de opções de um
  // teste, em que responder é marcar uma delas — não ganha campo de texto.
  const temResposta = bloco.filhos.some(
    (f) =>
      f.tipo === 'to_do' ||
      f.tipo === 'table' ||
      f.tipo === 'child_page' ||
      (f.tipo === 'child_database' && Boolean(f.itens?.length)) ||
      (f.tipo === 'paragraph' && !ehPergunta(f.texto)),
  );
  const comArquivo = pedeArquivo(bloco);

  return (
    <div className="rounded-lg bg-superficie-2 p-3.5">
      {bloco.texto ? <p className="font-medium">{bloco.texto}</p> : null}
      <div className={`space-y-2 ${bloco.texto ? 'mt-2' : ''}`}>
        {bloco.filhos.map((f) =>
          f.tipo === 'to_do' ? (
            <Opcao key={f.id} bloco={f} salvar={salvar} />
          ) : f.tipo === 'table' ? (
            <Tabela key={f.id} tabela={f} salvar={salvar} />
          ) : f.tipo === 'paragraph' && !ehPergunta(f.texto) ? (
            <Resposta key={f.id} blocoId={f.id} inicial={f.texto} salvar={salvar} />
          ) : f.tipo === 'child_page' && pagina ? (
            <div key={f.id}>{pagina(f)}</div>
          ) : (
            // `base` também aqui: é dentro da pergunta que mora a galeria de
            // opções do teste de estilo.
            <BlocosNotion key={f.id} blocos={[f]} base={base} />
          ),
        )}
        {temResposta || (comArquivo && anexar) ? null : <Resposta calloutId={bloco.id} inicial="" salvar={salvar} />}
        {comArquivo && anexar ? <EnviarArquivo calloutId={bloco.id} anexar={anexar} /> : null}
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

/** Uma tabela do Notion (a carteira de investimentos, por exemplo), editável no app. */
function Tabela({ tabela, salvar }: { tabela: BlocoSimples; salvar: Salvar }) {
  const [linhas, setLinhas] = useState(() =>
    tabela.filhos.map((f) => ({ id: f.id, celulas: [...(f.celulas ?? [])] })),
  );
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(false);
  const cabecalho = tabela.cabecalho ? linhas[0] : null;
  const corpo = cabecalho ? linhas.slice(1) : linhas;
  const colunas = cabecalho?.celulas.length ?? corpo[0]?.celulas.length ?? 1;

  const mudar = (linhaId: string, coluna: number, texto: string) =>
    setLinhas((l) => l.map((x) => (x.id === linhaId ? { ...x, celulas: x.celulas.map((c, i) => (i === coluna ? texto : c)) } : x)));

  /** Manda a linha inteira: assim duas células salvas seguidas não se atropelam. */
  const gravar = async (linhaId: string) => {
    const linha = linhas.find((x) => x.id === linhaId);
    if (!linha) return;
    setErro(false);
    const ok = await salvar({ acao: 'linhaDaTabela', blocoId: linha.id, celulas: linha.celulas });
    if (!ok) setErro(true);
  };

  const adicionar = async () => {
    setCriando(true);
    setErro(false);
    const id = await salvar({ acao: 'linha', blocoId: tabela.id });
    setCriando(false);
    if (!id) return setErro(true);
    setLinhas((l) => [...l, { id, celulas: Array.from({ length: colunas }, () => '') }]);
  };

  return (
    <div>
      <div className="rounded-lg border border-borda">
        {/* `table-fixed`: as colunas dividem a largura por igual e o texto quebra
            dentro da célula, em vez de a tabela sair rolando para o lado. */}
        <table className="w-full table-fixed text-xs">
          {cabecalho ? (
            <thead>
              <tr className="border-b border-borda bg-superficie-2 text-left">
                {cabecalho.celulas.map((c, i) => (
                  <th key={i} className="px-2 py-1.5 font-medium [overflow-wrap:anywhere] text-texto-suave">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {corpo.map((linha) => (
              <tr key={linha.id} className="border-b border-borda/60 last:border-0">
                {linha.celulas.map((c, i) => (
                  <td key={i} className="p-0 align-top">
                    <Celula
                      valor={c}
                      rotulo={cabecalho?.celulas[i] ?? `Coluna ${i + 1}`}
                      aoMudar={(v) => mudar(linha.id, i, v)}
                      aoSair={() => void gravar(linha.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={adicionar}
          disabled={criando}
          className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1 text-[11px] text-texto-suave transition hover:border-marca hover:text-marca disabled:opacity-60"
        >
          {criando ? <Loader2 aria-hidden size={11} className="animate-spin" /> : <Plus aria-hidden size={11} />}
          Nova linha
        </button>
        {erro ? <span className="text-[11px] text-parado">Não salvou. Tente de novo.</span> : null}
      </div>
    </div>
  );
}

/** Célula da tabela: cresce em altura conforme o texto, sem rolagem lateral. */
function Celula({
  valor,
  rotulo,
  aoMudar,
  aoSair,
}: {
  valor: string;
  rotulo: string;
  aoMudar: (v: string) => void;
  aoSair: () => void;
}) {
  return (
    <textarea
      value={valor}
      rows={1}
      aria-label={rotulo}
      onChange={(e) => {
        aoMudar(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      onBlur={aoSair}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="block w-full resize-none bg-transparent px-2 py-1.5 text-xs leading-snug [overflow-wrap:anywhere] outline-none transition focus:bg-superficie-2"
    />
  );
}
