'use client';

import type { BlocoSimples } from '@/lib/notion/blocks';

/** Renderiza os blocos que a Route Handler devolveu. */
export function BlocosNotion({ blocos }: { blocos: BlocoSimples[] }) {
  if (blocos.length === 0) {
    return <p className="text-sm text-texto-suave">Sem conteúdo nesta página.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocos.map((b) => (
        <Bloco key={b.id} bloco={b} />
      ))}
    </div>
  );
}

function Bloco({ bloco }: { bloco: BlocoSimples }) {
  const filhos = bloco.filhos.length ? (
    <div className="mt-2 space-y-2 border-l border-borda pl-4">
      {bloco.filhos.map((f) => (
        <Bloco key={f.id} bloco={f} />
      ))}
    </div>
  ) : null;

  switch (bloco.tipo) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      return (
        <div>
          <p className="mt-4 font-semibold tracking-tight first:mt-0">{bloco.texto}</p>
          {filhos}
        </div>
      );

    case 'bulleted_list_item':
      return (
        <div className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-texto-suave" />
          <div className="min-w-0 flex-1">
            <span>{bloco.texto}</span>
            {filhos}
          </div>
        </div>
      );

    case 'numbered_list_item':
      return (
        <div className="flex gap-2.5">
          <span aria-hidden className="text-texto-suave">
            •
          </span>
          <div className="min-w-0 flex-1">
            <span>{bloco.texto}</span>
            {filhos}
          </div>
        </div>
      );

    case 'to_do':
      return (
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
              bloco.marcado
                ? 'border-ok bg-ok-suave text-ok'
                : 'border-borda'
            }`}
          >
            {bloco.marcado ? '✓' : ''}
          </span>
          <div className="min-w-0 flex-1">
            <span className={bloco.marcado ? 'text-texto-suave line-through' : ''}>
              {bloco.texto}
            </span>
            {filhos}
          </div>
        </div>
      );

    case 'quote':
      return (
        <blockquote className="border-l-2 border-marca pl-4 text-texto-suave">
          {bloco.texto}
          {filhos}
        </blockquote>
      );

    case 'callout':
      // Callout é uma caixa: o texto dele funciona como título e o conteúdo vem
      // logo abaixo, sem a linha lateral dos blocos aninhados comuns.
      return (
        <div className="rounded-lg bg-superficie-2 p-3.5">
          {bloco.texto ? <p className="font-medium">{bloco.texto}</p> : null}
          {bloco.filhos.length ? (
            <div className={`space-y-2 ${bloco.texto ? 'mt-2' : ''}`}>
              {bloco.filhos.map((f) => (
                <Bloco key={f.id} bloco={f} />
              ))}
            </div>
          ) : null}
        </div>
      );

    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg bg-superficie-2 p-3.5 text-xs">
          <code>{bloco.texto}</code>
        </pre>
      );

    case 'image':
      return bloco.url ? (
        // Altura contida e centralizada: foto de retrato do Notion ocuparia a tela inteira.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bloco.url} alt={bloco.legenda ?? ''} className="mx-auto block h-auto max-h-80 w-auto max-w-full rounded-lg" />
      ) : null;

    case 'column_list': {
      // Colunas do Notion lado a lado (em tela estreita, uma embaixo da outra).
      // Coluna vazia sai: senão a outra fica espremida num canto em vez de
      // ocupar o espaço e ficar centralizada.
      const cheias = bloco.filhos.filter(temConteudo);
      return (
        <div
          className="grid gap-4 md:[grid-template-columns:repeat(var(--colunas),minmax(0,1fr))]"
          style={{ ['--colunas' as string]: String(Math.max(cheias.length, 1)) }}
        >
          {cheias.map((f) => (
            <Bloco key={f.id} bloco={f} />
          ))}
        </div>
      );
    }

    case 'column':
      return (
        <div className="min-w-0 space-y-2">
          {bloco.filhos.map((f) => (
            <Bloco key={f.id} bloco={f} />
          ))}
        </div>
      );

    case 'file':
    case 'pdf':
    case 'bookmark':
    case 'embed':
    case 'link_preview':
      return bloco.url ? (
        <a
          href={bloco.url}
          target="_blank"
          rel="noreferrer"
          className="text-marca underline underline-offset-2"
        >
          {bloco.legenda || bloco.texto || bloco.url}
        </a>
      ) : null;

    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-borda">
          <table className="w-full text-[13px]">
            <tbody>
              {bloco.filhos.map((linha, i) => {
                const Celula = bloco.cabecalho && i === 0 ? 'th' : 'td';
                return (
                  <tr key={linha.id} className="border-b border-borda last:border-0">
                    {(linha.celulas ?? []).map((c, j) => (
                      <Celula
                        key={j}
                        className={`border-r border-borda px-3 py-2 text-left align-top last:border-r-0 ${
                          Celula === 'th' ? 'bg-superficie-2 font-medium' : ''
                        }`}
                      >
                        {c}
                      </Celula>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );

    case 'divider':
      return <hr className="border-borda" />;

    case 'child_database':
      // Visualização vinculada: a API não devolve as linhas. Em vez de mostrar
      // um bloco vazio, não mostra nada.
      return null;

    default:
      return bloco.texto ? (
        <div>
          <p>{bloco.texto}</p>
          {filhos}
        </div>
      ) : (
        filhos
      );
  }
}

/** Tem algo para mostrar (texto, arquivo/imagem) em si ou em algum filho? */
function temConteudo(b: BlocoSimples): boolean {
  return Boolean(b.texto.trim() || b.url) || b.filhos.some(temConteudo);
}
