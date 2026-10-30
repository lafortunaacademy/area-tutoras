/**
 * As três portas de entrada do app.
 *
 * Cada público tem o seu endereço, e o endereço é só a porta: por dentro é o
 * mesmo sistema. Quem bate na porta errada não entra por ali, mas também não
 * fica no escuro — a tela diz qual é a dela e leva junto o e-mail digitado.
 *
 * Os endereços moram aqui, no código, e não em variáveis de ambiente: são três
 * e mudam quase nunca. Trocar um é mexer nesta lista e publicar, como qualquer
 * outra mudança.
 *
 * Em localhost e em qualquer endereço fora desta lista nada é barrado: todo
 * mundo entra por onde está. É o que mantém o desenvolvimento simples e evita
 * trancar alguém do lado de fora de um domínio novo que ainda não subiu.
 */
export type Porta = 'tutoras' | 'equipe' | 'clientes';

const ENDERECO: Record<Porta, string> = {
  tutoras: 'tutorias.lafortunaacademy.com.br',
  equipe: 'equipe.lafortunaacademy.com.br',
  clientes: 'cliente.lafortunaacademy.com.br',
};

export const NOME_DA_PORTA: Record<Porta, string> = {
  tutoras: 'de tutora',
  equipe: 'do time interno',
  clientes: 'de cliente',
};

/** Qual porta é este endereço. `null` em localhost e em qualquer host de fora da lista. */
export function portaDoHost(host: string | null): Porta | null {
  if (!host) return null;

  const limpo = host.split(':')[0].toLowerCase();
  return (Object.keys(ENDERECO) as Porta[]).find((p) => ENDERECO[p] === limpo) ?? null;
}

/** O endereço completo da porta, já com o e-mail para a pessoa não digitar de novo. */
export function urlDaPorta(porta: Porta, email?: string): string {
  const url = new URL(`https://${ENDERECO[porta]}/login`);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}

/**
 * O crachá vale para os três endereços, não para um só.
 *
 * Cada subdomínio é um site diferente aos olhos do navegador, com o seu
 * próprio cofre de cookies: entrar em `tutorias.` não entrava em `equipe.`.
 * Dizendo que o cookie é do domínio inteiro, uma entrada basta para as três
 * portas, e quem administra para de digitar e-mail a cada endereço.
 *
 * Fora da produção devolve `undefined`: em localhost o navegador recusa um
 * cookie de outro domínio e a sessão simplesmente não existiria.
 */
const DOMINIO = 'lafortunaacademy.com.br';

export function dominioDoCookie(host: string | null): string | undefined {
  const limpo = host?.split(':')[0].toLowerCase();
  return limpo?.endsWith(DOMINIO) ? `.${DOMINIO}` : undefined;
}

/**
 * O nome do cookie de sessão.
 *
 * Mudou junto com o domínio de propósito: os cookies antigos valiam para um
 * subdomínio só e, com o mesmo nome, os dois conviveriam e o navegador
 * mandaria os dois. O nome novo ignora os velhos de uma vez. O preço é uma
 * última entrada para quem já estava conectada.
 */
export const COOKIE_DA_SESSAO = 'lafortuna-auth';
