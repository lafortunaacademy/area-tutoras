/**
 * Rola até uma seção da própria página, sem passar pelo roteador.
 *
 * As seções chegam dentro de `Suspense`: quando o link com `#` é seguido antes
 * de a seção aparecer, o Next não acha o id e joga a página para o topo — no
 * celular, onde tudo carrega mais devagar, era o que acontecia sempre.
 *
 * Devolve `false` quando a seção ainda não está na tela; aí vale deixar o link
 * seguir o caminho normal.
 */
export function rolarAte(id: string): boolean {
  const alvo = document.getElementById(id);
  if (!alvo) return false;

  alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
  // O menu acompanha a âncora pelo hash, e `replaceState` não avisa ninguém.
  window.dispatchEvent(new Event('hashchange'));
  return true;
}
