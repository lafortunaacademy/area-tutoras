/**
 * Etiqueta de status com as cores do Notion: fundo claro, bolinha e texto da
 * mesma cor da opção escolhida lá.
 */
const CORES: Record<string, { fundo: string; texto: string; ponto: string }> = {
  default: { fundo: 'rgba(84,72,49,0.08)', texto: '#32302c', ponto: '#91918e' },
  gray: { fundo: '#e3e2e0', texto: '#32302c', ponto: '#91918e' },
  brown: { fundo: '#eee0da', texto: '#442a1e', ponto: '#bb846c' },
  orange: { fundo: '#fadec9', texto: '#49290e', ponto: '#d7813a' },
  yellow: { fundo: '#fdecc8', texto: '#402c1b', ponto: '#cb9434' },
  green: { fundo: '#dbeddb', texto: '#1c3829', ponto: '#6c9b7d' },
  blue: { fundo: '#d3e5ef', texto: '#183347', ponto: '#5b97bd' },
  purple: { fundo: '#e8deee', texto: '#412454', ponto: '#a782c3' },
  pink: { fundo: '#f5e0e9', texto: '#4c2337', ponto: '#cd749f' },
  red: { fundo: '#ffe2dd', texto: '#5d1715', ponto: '#e16f64' },
};

export function EtiquetaNotion({ texto, cor }: { texto: string; cor: string }) {
  if (!texto) return null;
  const c = CORES[cor.replace(/_background$/, '')] ?? CORES.default;
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: c.fundo, color: c.texto }}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: c.ponto }} />
      {texto}
    </span>
  );
}
