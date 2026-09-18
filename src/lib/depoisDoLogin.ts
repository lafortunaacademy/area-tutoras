/**
 * Para onde voltar depois do login (ex.: o formulário que a mentorada abriu).
 * Só caminhos do próprio app: nada de "//outro-site" ou endereço completo.
 */
export const COOKIE_DEPOIS_DO_LOGIN = 'depois_do_login';

export function caminhoSeguro(caminho: string | null | undefined): string | null {
  if (!caminho || !caminho.startsWith('/') || caminho.startsWith('//') || caminho.includes('\\')) return null;
  return caminho;
}
