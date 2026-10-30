/**
 * As três portas de entrada do app.
 *
 * Cada público tem o seu endereço, e o endereço é só a porta: por dentro é o
 * mesmo sistema. Quem bate na porta errada não entra por ali, mas também não
 * fica no escuro — a tela diz qual é a dela e leva junto o e-mail digitado.
 *
 * As portas só existem quando os endereços estão configurados na Vercel. Sem
 * as variáveis, nada é barrado: é o comportamento de sempre, com um endereço
 * só. É o que permite ligar isso quando os domínios estiverem no ar, sem
 * trancar ninguém do lado de fora no meio do caminho.
 */
export type Porta = 'tutoras' | 'equipe' | 'clientes';

export const NOME_DA_PORTA: Record<Porta, string> = {
  tutoras: 'de tutora',
  equipe: 'do time interno',
  clientes: 'de cliente',
};

function endereco(porta: Porta): string | null {
  const bruto = {
    tutoras: process.env.NEXT_PUBLIC_PORTA_TUTORAS,
    equipe: process.env.NEXT_PUBLIC_PORTA_EQUIPE,
    clientes: process.env.NEXT_PUBLIC_PORTA_CLIENTES,
  }[porta];

  return bruto?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '') || null;
}

/** Com menos de duas portas configuradas não há o que separar. */
export function portasLigadas(): boolean {
  return (['tutoras', 'equipe', 'clientes'] as Porta[]).filter((p) => endereco(p)).length >= 2;
}

/** Qual porta é este endereço. `null` em localhost e em qualquer host de fora da lista. */
export function portaDoHost(host: string | null): Porta | null {
  if (!host || !portasLigadas()) return null;

  const limpo = host.split(':')[0].toLowerCase();
  for (const porta of ['tutoras', 'equipe', 'clientes'] as Porta[]) {
    if (endereco(porta) === limpo) return porta;
  }
  return null;
}

/** O endereço completo da porta, já com o e-mail para a pessoa não digitar de novo. */
export function urlDaPorta(porta: Porta, email?: string): string | null {
  const host = endereco(porta);
  if (!host) return null;

  const url = new URL(`https://${host}/login`);
  if (email) url.searchParams.set('email', email);
  return url.toString();
}
