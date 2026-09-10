#!/usr/bin/env node
/**
 * Confere se os nomes em src/lib/notion/config.ts batem com o Notion real.
 * Rode depois de configurar o NOTION_TOKEN:  npm run notion:doctor
 */
import { readFileSync } from 'node:fs';

for (const linha of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
}

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN não configurado no .env.local');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type': 'application/json',
};

// Espelha src/lib/notion/config.ts. Mantido em JS puro para rodar sem bundler.
// "Mapas das clientes" saiu: na prática o mapa vem pela relation da mentorada.
const BASES = {
  tutoras: { titulo: 'Tutoras', props: ['Tutora', 'Status'] },
  areaDasTutoras: { titulo: 'Área das tutoras', props: ['Cliente', 'Status', 'Mentoria', 'Tutora'] },
  planejamento: { titulo: 'Planejamento estratégico: objetivos', props: ['Objetivo', 'Status', 'Trimestre', 'Mês', 'Pilar', 'Tutoria', 'Ano', 'Área da mentorada'] },
  briefings: { titulo: 'Briefings', props: ['Briefing', 'Data', 'Mentoria', 'Para a tutora:', 'Mentorada'] },
  handsoff: { titulo: 'Hands-off', props: ['Nome', 'Data da sessão', 'Feito pela tutora:', 'Mentorada'] },
};

let problemas = 0;

for (const [chave, base] of Object.entries(BASES)) {
  const fixado = process.env[`NOTION_DB_${chave.toUpperCase()}`];
  let id = fixado;

  if (!id) {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: base.titulo, filter: { property: 'object', value: 'database' } }),
    });
    const json = await res.json();
    const exato = (json.results ?? []).find(
      (r) => (r.title ?? []).map((t) => t.plain_text).join('').trim().toLowerCase() === base.titulo.toLowerCase(),
    );
    id = exato?.id;
  }

  if (!id) {
    console.log(`✗ ${base.titulo} — não encontrada. Compartilhe a base com a integração, ou defina NOTION_DB_${chave.toUpperCase()}.`);
    problemas++;
    continue;
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${id}`, { headers });
  if (!res.ok) {
    console.log(`✗ ${base.titulo} — ID ${id} inacessível (${res.status}).`);
    problemas++;
    continue;
  }

  const db = await res.json();
  const disponiveis = Object.values(db.properties).map((p) => p.name);
  const faltando = base.props.filter((p) => !disponiveis.includes(p));

  console.log(`${faltando.length ? '⚠' : '✓'} ${base.titulo}  ${id}`);
  if (faltando.length) {
    console.log(`   faltando: ${faltando.join(', ')}`);
    console.log(`   existe:   ${disponiveis.join(', ')}`);
    problemas++;
  }
}

console.log(problemas ? `\n${problemas} ponto(s) a ajustar em src/lib/notion/config.ts.` : '\nTudo batendo.');
