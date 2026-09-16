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
const { mapaDaCliente, planejamento, briefings, handsoffs, paginaPertenceA } = await import(
  '../src/lib/notion/mentorada.js'
);
const { lerBlocos } = await import('../src/lib/notion/blocks.js');

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
const carteira = await carteiraDaTutora();
console.log(`  ${carteira.length} mentorada(s) ativas`);
ok(carteira.length > 0, 'a lista de mentoradas não veio vazia');
ok(
  carteira.every((m) => m.areaDaClienteIds.length > 0),
  'toda mentorada tem área individual (ela mesma)',
);
ok(carteira.filter((m) => m.foto).length > carteira.length * 0.8, 'quase todas têm foto');

const nomeTutora = 'Luíza Sales';
const tutoraId = TUTORAS[nomeTutora as keyof typeof TUTORAS];
const mentorada = carteira.find((m) => m.mentoria) ?? carteira[0];
console.log(`\n— ${nomeTutora} / ${mentorada.nome} —`);

ok(Boolean(mentorada.nome), 'mentorada tem nome (title lido)');
ok(
  typeof mentorada.mentoria === 'string',
  `mentoria: ${mentorada.mentoria ? `"${mentorada.mentoria}"` : '(vazia — depende da base não compartilhada)'}`,
);
ok(Boolean(mentorada.status), `status lido: "${mentorada.status}"`);
ok(normalizarId(mentorada.id.replace(/-/g, '')) === mentorada.id, 'normalizarId ida e volta');

const mapa = await mapaDaCliente(mentorada);
console.log(`  mapa: ${mapa.length} item(ns)`);

const plano = await planejamento(mentorada);
ok(
  plano !== null && plano.length > 0,
  `planejamento recortado pela Área da cliente — ${plano === null ? 'null (sem vínculo)' : `${plano.length} objetivo(s)`}`,
);
if (plano) {
  ok(
    plano.every((o) => o.objetivo),
    'todo objetivo tem título',
  );
}

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

const daMentorada = await Promise.all(
  [...brief, ...hands].map((i) => paginaPertenceA(mentorada, i.id)),
);
ok(
  daMentorada.every(Boolean),
  'tudo que a tela lista passa na checagem de "é desta mentorada?"',
);

console.log('\n— isolamento —');
const deFora = carteira.find((m) => m.id !== mentorada.id);
ok(Boolean(deFora), 'existe outra mentorada para testar');
if (deFora) {
  const primeiro = [...brief, ...hands][0];
  if (primeiro) {
    ok(
      !(await paginaPertenceA(deFora, primeiro.id)),
      'página desta mentorada NÃO passa na checagem de outra',
    );
  }

  const handsDeFora = await handsoffs(deFora, tutoraId);
  const meusIds = new Set(hands.map((h) => h.id));
  ok(
    handsDeFora.every((h) => !meusIds.has(h.id)),
    'hands-off de outra mentorada não se mistura com os desta',
  );

  const planoDeFora = await planejamento(deFora);
  const meusObj = new Set((plano ?? []).map((o) => o.id));
  ok(
    (planoDeFora ?? []).every((o) => !meusObj.has(o.id)),
    'objetivos de outra mentorada não se misturam com os desta',
  );
}

console.log('\n— tutorias (controle) —');
const { tutoriasDaTutora } = await import('../src/lib/notion/tutorias.js');
for (const [nome, email] of [
  ['Luíza Sales', 'luiza@luizasales.com'],
  ['Rafaela Trajano', 'rafaelastrajano@gmail.com'],
]) {
  const t = await tutoriasDaTutora(email);
  const comData = t.filter((x) => x.data).length;
  console.log(`  ${nome}: ${t.length} realizada(s), ${comData} com data`);
  ok(t.length > 0, `${nome} tem tutorias no controle`);
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
