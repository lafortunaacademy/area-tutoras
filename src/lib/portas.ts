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
