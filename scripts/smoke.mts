/**
 * Exercita a camada de dados do app contra o Notion real.
 *
 * Não é teste automatizado: é o passo de conferir que os módulos que eu escrevi
 * funcionam com os dados de verdade, antes de existir Supabase para logar.
 *
 *   npm run notion:smoke
 */
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const { carteiraDaTutora, normalizarId } = await import('../src/lib/notion/carteira.js');
const { mapaDaCliente, planejamento, briefings, handsoffs, pageIdsPermitidos } = await import(
  '../src/lib/notion/mentorada.js'
);
const { lerBlocos } = await import('../src/lib/notion/blocks.js');
const { queryDatabase } = await import('../src/lib/notion/client.js');

const TUTORAS = {
  'Rafaela Trajano': '3bb64a56-eca0-8061-98cf-e85c0fe1f987',
  'Luíza Sales': '3bb64a56-eca0-806f-9718-eac18d6ea6df',
  'Camila Pauli': '3cf64a56-eca0-8026-9377-d7e99cf62486',
};

let falhas = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) falhas++;
};

console.log('— carteira —');
const carteiras = new Map<string, Awaited<ReturnType<typeof carteiraDaTutora>>>();
for (const [nome, id] of Object.entries(TUTORAS)) {
  const c = await carteiraDaTutora(id);
  carteiras.set(nome, c);
  console.log(`  ${nome}: ${c.length} mentorada(s) — ${c.map((m) => m.nome).join(', ') || '(vazia)'}`);
}

const [nomeTutora, carteira] = [...carteiras.entries()].find(([, c]) => c.length > 0) ?? [];
if (!carteira?.length || !nomeTutora) {
  console.log('\nNenhuma tutora com carteira: nada mais a exercitar.');
  process.exit(1);
}

const tutoraId = TUTORAS[nomeTutora as keyof typeof TUTORAS];
const mentorada = carteira[0];
console.log(`\n— ${nomeTutora} / ${mentorada.nome} —`);

ok(Boolean(mentorada.nome), 'mentorada tem nome (title lido)');
ok(
  typeof mentorada.mentoria === 'string',
  `mentoria: ${mentorada.mentoria ? `"${mentorada.mentoria}"` : '(vazia — depende da base não compartilhada)'}`,
);
ok(mentorada.status === 'Ativa', `status lido do tipo status: "${mentorada.status}"`);
ok(normalizarId(mentorada.id.replace(/-/g, '')) === mentorada.id, 'normalizarId ida e volta');

const mapa = await mapaDaCliente(mentorada);
console.log(`  mapa: ${mapa.length} item(ns)`);

const plano = await planejamento(mentorada);
ok(
  plano === null,
  `planejamento devolve null (relation cega) em vez de lista vazia — veio ${plano === null ? 'null' : `${plano.length} item(ns)`}`,
);

const brief = await briefings(mentorada, tutoraId);
console.log(`  briefings: ${brief.length}`);
ok(
  brief.every((b) => b.titulo),
  'todo briefing tem título',
);

const hands = await handsoffs(mentorada, tutoraId);
console.log(`  hands-off: ${hands.length}`);
ok(
  hands.every((h) => h.dataSessao),
  'todo hands-off tem data formatada em pt-BR',
);

const permitidos = await pageIdsPermitidos(mentorada, tutoraId);
console.log(`  páginas liberadas para leitura sob demanda: ${permitidos.size}`);
ok(
  [...brief, ...hands].every((i) => permitidos.has(i.id)),
  'tudo que a tela lista está na lista de páginas liberadas',
);

console.log('\n— isolamento —');
const AREA = process.env.NOTION_DB_AREADASTUTORAS!;
const todas = await queryDatabase(AREA, { limite: 100 });
const deFora = todas.find((p) => !carteira.some((m) => m.id === p.id));
ok(Boolean(deFora), 'existe mentorada fora da carteira para testar');
if (deFora) {
  ok(!permitidos.has(deFora.id), 'mentorada de fora NÃO está entre as páginas liberadas');
  const handsDeFora = await handsoffs({ ...mentorada, id: deFora.id }, tutoraId);
  ok(
    handsDeFora.length === 0,
    'query de hands-off com mentorada de fora + esta tutora não devolve nada',
  );
}

console.log('\n— blocos sob demanda —');
const alvo = hands[0] ?? brief[0];
if (alvo) {
  const blocos = await lerBlocos(alvo.id);
  console.log(`  "${alvo.titulo}": ${blocos.length} bloco(s) de topo`);
  const tipos = [...new Set(blocos.map((b) => b.tipo))];
  console.log(`  tipos: ${tipos.join(', ')}`);
  ok(blocos.length > 0, 'leu os blocos da página');
  const comTexto = blocos.filter((b) => b.texto).slice(0, 3);
  for (const b of comTexto) console.log(`    ${b.tipo}: "${b.texto.slice(0, 60)}"`);
} else {
  console.log('  (sem página para abrir)');
}

console.log(`\n${falhas === 0 ? 'tudo passou' : `${falhas} verificação(ões) falharam`}`);
process.exit(falhas === 0 ? 0 : 1);
