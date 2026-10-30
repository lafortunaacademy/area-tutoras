/**
 * A estampa da marca atrás da tela de entrada.
 *
 * É a primeira coisa que qualquer pessoa vê do sistema, e era uma página
 * creme lisa. O padrão entra bem apagado, por trás da luz de fundo e do
 * cartão: dá o ar da La Fortuna sem roubar a atenção do campo de e-mail.
 *
 * Só decoração, então some para quem lê a tela e não recebe clique.
 */
export function EstampaDeFundo() {
  return (
    <div
      aria-hidden
      className="estampa-de-fundo pointer-events-none absolute inset-0 bg-[length:150px_165px] bg-repeat"
      style={{ backgroundImage: 'url(/marca/estampa.png)' }}
    />
  );
}
