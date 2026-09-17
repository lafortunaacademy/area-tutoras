#!/usr/bin/env node
/**
 * Libera o acesso de uma mentorada à área de membros. Roda só na sua máquina,
 * com a service-role key.
 *
 *   npm run mentorada:add -- --email ana@exemplo.com \
 *                            --nome "Ana Souza" \
 *                            --notion <id-da-pagina-dela-em-Area-clientes>
 *
 * O ID da página aparece no endereço da mentorada no app:
 * /mentoradas/<id>.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, todos) => {
    if (!a.startsWith('--')) return [];
    const proximo = todos[i + 1];
    return [[a.slice(2), proximo === undefined || proximo.startsWith('--') ? true : proximo]];
  }),
);

if (!args.email || !args.nome || !args.notion) {
  console.error('Uso: npm run mentorada:add -- --email <e-mail> --nome <nome> --notion <page-id>');
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await db
  .from('mentoradas_acesso')
  .upsert(
    {
      email: String(args.email).toLowerCase(),
      nome: args.nome,
      // Sem hífens ou com hífens, tanto faz: o app normaliza os dois lados.
      notion_page_id: String(args.notion),
      ativa: true,
    },
    { onConflict: 'email' },
  )
  .select()
  .single();

if (error) {
  console.error('Falhou:', error.message);
  process.exit(1);
}

// A linha diz quem PODE entrar; o usuário no auth do Supabase é quem existe
// para receber magic link. Ninguém se cadastra sozinho, então ele é criado aqui.
const { error: erroAuth } = await db.auth.admin.createUser({ email: data.email, email_confirm: true });

if (erroAuth && !/already|exists|registered/i.test(erroAuth.message)) {
  console.error('Linha criada, mas o usuário de auth falhou:', erroAuth.message);
  process.exit(1);
}

console.log(`OK — ${data.nome} <${data.email}> -> /mentoradas/${data.notion_page_id}` + (erroAuth ? ' [auth já existia]' : ''));
