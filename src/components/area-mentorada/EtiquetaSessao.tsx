/**
 * O tipo da sessão (a propriedade "Sessão " do Notion: Check-in, Tutoria,
 * Planejamento, Call SOS) como etiqueta, nas cores da marca.
 *
 * Cada opção do Notion ganha um tom da marca, sempre o mesmo — a cor vem
 * pronta da sessão (`corTipo`), pela ordem das opções lá.
 */
export function EtiquetaSessao({ tipo, cor }: { tipo: string; cor?: string }) {
  if (!tipo) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: cor ?? 'var(--etiqueta-5)', color: 'var(--etiqueta-texto)' }}
    >
      {tipo}
    </span>
  );
}
