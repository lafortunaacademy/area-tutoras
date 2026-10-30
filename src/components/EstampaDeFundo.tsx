/**
 * A estampa da marca por trás da área da mentorada.
 *
 * Fica fixa e bem apagada: é marca d'água, não papel de parede. O conteúdo
 * passa por cima sem disputar atenção, e a página continua legível quando a
 * pessoa rola, porque o padrão não acompanha a rolagem.
 *
 * Só decoração, então some para quem lê a tela e não recebe clique.
 */
export function EstampaDeFundo() {
  return (
    <div
      aria-hidden
      className="estampa-de-fundo pointer-events-none fixed inset-0 -z-10 bg-[length:150px_165px] bg-repeat"
      style={{ backgroundImage: 'url(/marca/estampa.png)' }}
    />
  );
}
