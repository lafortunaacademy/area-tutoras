#!/usr/bin/env node
/**
 * Cadastra uma tutora. Roda só na sua máquina, com a service-role key.
 *
 *   npm run tutora:add -- --email ana@exemplo.com \
 *                         --nome "Ana Souza" \
 *                         --notion <id-da-pagina-dela-na-base-Tutoras> \
 *                         [--admin]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

// Flag sem valor (--admin, ou --admin no fim da linha) vale `true`.
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, todos) => {
    if (!a.startsWith('--')) return [];
    const proximo = todos[i + 1];
    return [[a.slice(2), proximo === undefined || proximo.startsWith('--') ? true : proximo]];
  }),
);

if (!args.email || !args.nome || !args.notion) {
  console.error('Uso: npm run tutora:add -- --email <e-mail> --nome <nome> --notion <page-id> [--admin]');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await db
  .from('tutoras')
  .upsert(
    {
      email: String(args.email).toLowerCase(),
      nome: args.nome,
      notion_tutora_page_id: args.notion,
      is_admin: args.admin === true,
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

// A linha em `tutoras` diz quem PODE entrar; o usuário no auth do Supabase é
// quem existe para receber magic link. O login usa shouldCreateUser: false, de
// propósito — ninguém se cadastra sozinho —, então o usuário precisa ser criado
// aqui, junto com a linha.
const { error: erroAuth } = await db.auth.admin.createUser({
  email: data.email,
  email_confirm: true,
});

if (erroAuth && !/already|exists|registered/i.test(erroAuth.message)) {
  console.error('Linha criada, mas o usuário de auth falhou:', erroAuth.message);
  process.exit(1);
}

console.log(
  `OK — ${data.nome} <${data.email}>${data.is_admin ? ' (admin)' : ''}` +
    (erroAuth ? ' [auth já existia]' : ''),
);
