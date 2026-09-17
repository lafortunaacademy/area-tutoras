import type { IconeNotion } from '@/lib/notion/pilares';

/** Ícone de página ou callout do Notion: emoji ou a imagem do ícone nativo. */
export function Icone({ icone, tamanho }: { icone: IconeNotion; tamanho: number }) {
  if (!icone) return null;
  if (icone.tipo === 'emoji') {
    return (
      <span aria-hidden className="shrink-0 leading-none" style={{ fontSize: tamanho }}>
        {icone.emoji}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={icone.url} alt="" width={tamanho} height={tamanho} className="shrink-0" />;
}
