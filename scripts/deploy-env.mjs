#!/usr/bin/env node
/**
 * Lista as variáveis a colar na Vercel, lendo o .env.local.
 *
 * Os segredos aparecem mascarados por padrão — quem for colar roda com
 * `--revelar`, que é uma escolha consciente e não um descuido de tela
 * compartilhada.
 */
import { readFileSync } from 'node:fs';

const revelar = process.argv.includes('--revelar');
const SEGREDOS = ['SUPABASE_SERVICE_ROLE_KEY', 'NOTION_TOKEN', 'PREVIEW_COOKIE_SECRET'];

const linhas = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n');

for (const linha of linhas) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;

  const [, nome, valor] = m;
  if (!valor) continue;

  const segredo = SEGREDOS.includes(nome);
  const saida = segredo && !revelar ? `${valor.slice(0, 8)}…${'*'.repeat(12)}` : valor;
  console.log(`${nome}=${saida}`);
}

if (!revelar) console.log('\n(segredos mascarados — rode com --revelar para colar na Vercel)');
console.log('\nNEXT_PUBLIC_SITE_URL deve virar o endereço da Vercel.');
