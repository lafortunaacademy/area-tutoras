/**
 * A faixa da estampa no alto da área: o mesmo padrão do topo da área da
 * mentorada, numa tira fina. Só decoração, então some para quem lê a tela.
 */
export function FaixaDaMarca() {
  return (
    <div
      aria-hidden
      className="hidden h-14 bg-marca bg-[length:auto_112px] bg-center bg-repeat-x lg:block"
      style={{ backgroundImage: 'url(/marca/estampa.png)' }}
    />
  );
}
