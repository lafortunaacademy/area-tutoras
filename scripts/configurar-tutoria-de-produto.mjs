#!/usr/bin/env node
/**
 * Transforma o material "Tutoria de produto" (Pilar Negócio › Produto ›
 * Produto) no registro que a equipe preenche, uma caixinha por fluxo desenhado:
 *   Estrutura do método  (link do mapa mental — Canva, Miro, MindMeister… — e/ou arquivo)
 *
 *   node scripts/configurar-tutoria-de-produto.mjs
 *
 * Pode rodar de novo: refaz as perguntas (e apaga os registros já feitos).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = (r, onde) => { if (r.error) throw new Error(`${onde}: ${r.error.message}`); return r.data; };

const materiais = ok(await db.from('tutoria_materiais').select('id').eq('nome', 'Tutoria de produto'), 'material');
if (materiais.length !== 1) throw new Error(`Esperava 1 material "Tutoria de produto", achei ${materiais.length}.`);
const material = materiais[0];

ok(await db.from('tutoria_materiais').update({ tipo: 'formulario', quem_preenche: 'equipe' }).eq('id', material.id), 'atualizar material');
ok(await db.from('tutoria_perguntas').delete().eq('material_id', material.id), 'limpar perguntas');
ok(
  await db.from('tutoria_perguntas').insert([
    // A sessão (base de Sessões) a que o registro se refere: dá o nome e a data da caixinha.
    { material_id: material.id, ordem: -1, tipo: 'sessao', texto: 'Sessão', opcoes: [] },
    {
      material_id: material.id,
      ordem: 0,
      tipo: 'anexos',
      texto: 'Estrutura do método',
      ajuda: 'Cole o link do mapa mental (Canva, Miro, MindMeister…)',
      opcoes: [],
    },
  ]),
  'perguntas',
);
console.log('Tutoria de produto configurada como registro da equipe.');
