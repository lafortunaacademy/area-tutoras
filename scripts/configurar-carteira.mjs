#!/usr/bin/env node
/**
 * Transforma o material "Carteira de investimentos" (Pilar Dinheiro ›
 * Investimentos) no registro que a equipe preenche, uma carteira por vez:
 *   Anotações  (texto)
 *   Carteira   (tabela: Plataforma, Categoria, Produto, CNPJ, % Patrimônio, Liquidez, Status)
 *
 *   node scripts/configurar-carteira.mjs
 *
 * Precisa da migração 0006. Pode rodar de novo: refaz as perguntas (e apaga
 * os registros já feitos, que dependem delas).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = (r, onde) => { if (r.error) throw new Error(`${onde}: ${r.error.message}`); return r.data; };

const [tutoria] = ok(await db.from('tutoria_tutorias').select('id').eq('nome', 'Investimentos'), 'tutoria');
if (!tutoria) throw new Error('Tutoria "Investimentos" não encontrada.');
const [material] = ok(await db.from('tutoria_materiais').select('id').eq('tutoria_id', tutoria.id).eq('nome', 'Carteira de investimentos'), 'material');
if (!material) throw new Error('Material "Carteira de investimentos" não encontrado.');

ok(await db.from('tutoria_materiais').update({ tipo: 'formulario', quem_preenche: 'equipe' }).eq('id', material.id), 'atualizar material');
ok(await db.from('tutoria_perguntas').delete().eq('material_id', material.id), 'limpar perguntas');
ok(
  await db.from('tutoria_perguntas').insert([
    { material_id: material.id, ordem: 0, tipo: 'texto', texto: 'Anotações' },
    {
      material_id: material.id,
      ordem: 1,
      tipo: 'tabela',
      texto: 'Carteira',
      opcoes: ['Plataforma', 'Categoria', 'Produto', 'CNPJ', '% Patrimônio', 'Liquidez', 'Status'],
    },
  ]),
  'perguntas',
);
console.log('Carteira de investimentos configurada como registro da equipe.');
