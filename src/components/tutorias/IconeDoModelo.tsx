/** Ícone guardado no modelo: endereço de imagem (ícone do Notion) ou emoji. */
export function IconeDoModelo({ icone, tamanho }: { icone: string | null; tamanho: number }) {
  if (!icone) return null;
  if (icone.startsWith('http')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icone} alt="" width={tamanho} height={tamanho} className="shrink-0" />;
  }
  return (
    <span aria-hidden className="shrink-0 leading-none" style={{ fontSize: tamanho }}>
      {icone}
    </span>
  );
}
