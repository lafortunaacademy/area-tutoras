#!/usr/bin/env node
/**
 * Transforma o material "Tutoria terapêutica" (Pilar Líder › Terapêuticas) no
 * registro que a equipe preenche a cada sessão:
 *   Pontos importantes abordados na sessão  (texto, um por linha)
 *   Cuidados necessários e pontos de atenção (texto, um por linha)
 *   Próximos passos                           (as Tarefas da mentoria)
 *   Material complementar                     (arquivos)
 *
 *   node scripts/configurar-tutoria-terapeutica.mjs
 *
 * Precisa da migração 0005. Pode rodar de novo: refaz as perguntas (e apaga
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

const [tutoria] = ok(await db.from('tutoria_tutorias').select('id').eq('nome', 'Terapêuticas'), 'tutoria');
if (!tutoria) throw new Error('Tutoria "Terapêuticas" não encontrada.');
const [material] = ok(await db.from('tutoria_materiais').select('id').eq('tutoria_id', tutoria.id).eq('nome', 'Tutoria terapêutica'), 'material');
if (!material) throw new Error('Material "Tutoria terapêutica" não encontrado.');

ok(await db.from('tutoria_materiais').update({ tipo: 'formulario', quem_preenche: 'equipe' }).eq('id', material.id), 'atualizar material');
ok(await db.from('tutoria_perguntas').delete().eq('material_id', material.id), 'limpar perguntas');
ok(
  await db.from('tutoria_perguntas').insert([
    { material_id: material.id, ordem: 0, tipo: 'texto', texto: 'Pontos importantes abordados na sessão', ajuda: 'Um por linha.' },
    { material_id: material.id, ordem: 1, tipo: 'texto', texto: 'Cuidados necessários e pontos de atenção', ajuda: 'Um por linha.' },
    { material_id: material.id, ordem: 2, tipo: 'tarefas', texto: 'Próximos passos', ajuda: 'As Tarefas da mentoria: o que entra aqui aparece também na página da mentorada.' },
    { material_id: material.id, ordem: 3, tipo: 'arquivo', texto: 'Material complementar', ajuda: 'PDFs, imagens ou documentos, até 4 MB cada.' },
  ]),
  'perguntas',
);
console.log('Tutoria terapêutica configurada como registro da equipe.');
