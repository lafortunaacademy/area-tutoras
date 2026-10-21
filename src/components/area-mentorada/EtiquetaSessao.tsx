/**
 * O tipo da sessão (a propriedade "Sessão " do Notion: Check-in, Tutoria,
 * Planejamento, Call SOS) como etiqueta, nas cores da marca.
 *
 * Cada opção do Notion ganha uma das seis cores do guia de marca, sempre a
 * mesma — qual delas vem pronto da sessão (`corTipo`), pela ordem das opções lá.
 */
export function EtiquetaSessao({ tipo, cor }: { tipo: string; cor?: string }) {
  if (!tipo) return null;
  const par = cor || 'etiqueta-1';
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `var(--${par})`, color: `var(--${par}-texto)` }}
    >
      {tipo}
    </span>
  );
}
