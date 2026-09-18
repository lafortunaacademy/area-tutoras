#!/usr/bin/env node
/**
 * Importa UMA VEZ o modelo das tutorias do Notion para o app (pilares,
 * tutorias, materiais e as perguntas dos formulários). Depois disso o app é a
 * fonte: nada mais é lido do Notion nas Tutorias.
 *
 *   node scripts/importar-modelo-tutorias.mjs --pagina <id-da-pagina-Tutorias>   (só mostra)
 *   node scripts/importar-modelo-tutorias.mjs --pagina <id> --gravar              (grava; apaga o modelo anterior)
 *
 * Respostas não são importadas: cada mentorada começa em branco.
 */
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
if (!args.pagina) {
  console.error('Uso: node scripts/importar-modelo-tutorias.mjs --pagina <id-da-pagina-Tutorias> [--gravar]');
  process.exit(1);
}

// --- Notion -----------------------------------------------------------------

const H = { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
async function api(caminho, corpo) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const r = await fetch(`https://api.notion.com/v1/${caminho}`, { method: corpo ? 'POST' : 'GET', headers: H, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 1000 * (tentativa + 1))); continue; }
    return r.json();
  }
  throw new Error(`Notion não respondeu: ${caminho}`);
}
async function filhos(id) {
  const todos = [];
  let cursor;
  do {
    const j = await api(`blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    todos.push(...(j.results ?? []));
    cursor = j.next_cursor;
  } while (cursor);
  return todos;
}
async function linhas(dbId) {
  const j = await api(`databases/${dbId}/query`, { page_size: 100 });
  return j.code ? null : j.results;
}
const texto = (b) => { const c = b[b.type] ?? {}; return (c.title ?? (c.rich_text ?? []).map((t) => t.plain_text).join('')).trim(); };
const pedacos = (b) => ((b[b.type] ?? {}).rich_text ?? []).map((t) => ({ texto: t.plain_text, negrito: Boolean(t.annotations?.bold) })).filter((t) => t.texto);
const tituloDe = (p) => (Object.values(p.properties).find((x) => x.type === 'title')?.title ?? []).map((t) => t.plain_text).join('').split('|')[0].trim();
function icone(i) {
  if (!i) return null;
  if (i.type === 'emoji') return i.emoji;
  if (i.type === 'icon') return `https://www.notion.so/icons/${i.icon.name}_${i.icon.color ?? 'gray'}.svg`;
  if (i.type === 'external') return i.external.url;
  return null; // arquivo do Notion: URL expira, não serve
}
const normal = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
const semTutoria = (t) => { const l = t.replace(/^tutorias?\s+(de\s+|do\s+|da\s+)?/i, '').trim() || t.trim(); return l[0].toUpperCase() + l.slice(1); };
// Pergunta, ou frase para completar ("A minha empresa é focada em…", "[Nome da Empresa]").
const ehPergunta = (t) => /([?:…]|\.\.\.)\s*$/.test(t.trim()) || /\[[^\]]+\]/.test(t);
const pedeArquivo = (t) => /print|arquivo|anex|foto|imagem|upload|documento|pdf/i.test(t);
const ESPECIAIS = [/teste de estilo/i, /temas\s*&\s*roteiros/i];

// --- Leitura do modelo -------------------------------------------------------

/** Perguntas de uma página-formulário, na ordem. */
async function perguntasDe(paginaId) {
  const perguntas = [];
  let secao = null;
  const add = (p) => perguntas.push({ secao, ajuda: null, opcoes: [], ...p });

  // To-dos soltos na página (fora de callout) viram uma pergunta de opções; o
  // enunciado é o aviso logo antes, quando ele tem cara de pergunta.
  let soltas = [];
  const fecharSoltas = () => {
    if (!soltas.length) return;
    const anterior = perguntas[perguntas.length - 1];
    let enunciado = secao ?? 'Marque as opções';
    if (anterior?.tipo === 'aviso' && ehPergunta(anterior.texto)) enunciado = perguntas.pop().texto;
    add({ tipo: 'opcoes', texto: enunciado, opcoes: soltas });
    soltas = [];
  };

  const visitar = async (blocos) => {
    for (const b of blocos) {
      const t = texto(b);
      if (b.type === 'to_do') { if (t) soltas.push(t); continue; }
      fecharSoltas();
      if (b.type.startsWith('heading')) { secao = t || secao; continue; }
      if (b.type === 'column_list' || b.type === 'column') { await visitar(await filhos(b.id)); continue; }
      if (b.type === 'paragraph' || b.type === 'bulleted_list_item' || b.type === 'quote') { if (t) add({ tipo: 'aviso', texto: t }); continue; }
      if (b.type !== 'callout') continue;

      const dentro = b.has_children ? await filhos(b.id) : [];
      let titulo = t;
      const ajuda = [];
      let opcoes = [];
      let criouAlgo = false;
      const fecharOpcoes = () => {
        if (!opcoes.length) return;
        add({ tipo: 'opcoes', texto: titulo || 'Marque as opções', opcoes, ajuda: ajuda.join('\n') || null });
        opcoes = []; ajuda.length = 0; criouAlgo = true;
      };

      let rotulo = null; // "Primeiro trimestre": subtítulo solto dentro do callout
      let listaAberta = false;
      for (const f of dentro) {
        const tf = texto(f);
        if (f.type === 'to_do') {
          if (tf) { opcoes.push(tf); continue; }
          // To-do vazio é lista para a mentorada escrever (ações, metas): vira um campo de texto.
          if (!listaAberta) {
            add({ tipo: 'texto', texto: [titulo, rotulo].filter(Boolean).join(' — ') || 'Suas ações', ajuda: 'Uma por linha.' });
            listaAberta = true; criouAlgo = true;
          }
          continue;
        }
        listaAberta = false;
        fecharOpcoes();
        if (f.type === 'bulleted_list_item' && f.has_children) {
          // "Bio", "Destaques"…: cada item com espaço embaixo é um campo.
          const sob = await filhos(f.id);
          if (sob.some((x) => ['image', 'file', 'pdf'].includes(x.type))) { add({ tipo: 'arquivo', texto: tf || titulo }); criouAlgo = true; continue; }
          if (sob.some((x) => x.type === 'paragraph' && !texto(x))) { add({ tipo: 'texto', texto: tf || titulo, ajuda: titulo && tf ? titulo : null }); criouAlgo = true; continue; }
        }
        if (f.type === 'bulleted_list_item' && !tf) { add({ tipo: 'texto', texto: titulo || 'Sua resposta' }); criouAlgo = true; continue; }
        if (f.type === 'paragraph' && tf && titulo && !ehPergunta(tf) && dentro.some((x) => x.type === 'to_do' && !texto(x))) { rotulo = tf; continue; }
        if (f.type === 'paragraph') {
          if (!tf) { add({ tipo: 'texto', texto: titulo || 'Sua resposta', ajuda: ajuda.join('\n') || null }); ajuda.length = 0; criouAlgo = true; }
          else if (ehPergunta(tf)) { titulo = tf; criouAlgo = false; }
          else if (!titulo) titulo = tf;
          else ajuda.push(tf);
        } else if (f.type === 'bulleted_list_item' || f.type === 'numbered_list_item') {
          if (tf) ajuda.push(`• ${tf}`);
        } else if (['image', 'file', 'pdf', 'column_list', 'video'].includes(f.type)) {
          if (!perguntas.some((p) => p.tipo === 'arquivo' && p.texto === titulo)) { add({ tipo: 'arquivo', texto: titulo || 'Envie o arquivo' }); criouAlgo = true; }
        }
      }
      fecharOpcoes();

      // Callout sem campo de resposta só vira pergunta se tiver cara de pergunta
      // (ou pedir arquivo); título solto de conteúdo ("Materiais", vídeo) não.
      const temMidia = dentro.some((f) => ['embed', 'video', 'bookmark', 'link_preview'].includes(f.type));
      if (!criouAlgo && titulo && !temMidia && (ehPergunta(titulo) || pedeArquivo(titulo))) {
        add({ tipo: pedeArquivo(titulo) ? 'arquivo' : 'texto', texto: titulo, ajuda: ajuda.join('\n') || null });
      }
    }
  };
  await visitar(await filhos(paginaId));
  fecharSoltas();
  return perguntas;
}

/** Um material (página): formulário, conteúdo, grupo ou especial — com os filhos. */
async function material(pagina, profundidade = 0) {
  const nome = tituloDe(pagina);
  const base = { nome, icone: icone(pagina.icon), filhos: [], perguntas: [] };
  if (ESPECIAIS.some((r) => r.test(nome))) return { ...base, tipo: 'especial' };

  const blocos = await filhos(pagina.id);
  const bases = [];
  const achar = async (lista, d = 0) => {
    for (const b of lista) {
      if (b.type === 'child_database') bases.push(b);
      else if (b.has_children && b.type !== 'child_page' && d < 2) await achar(await filhos(b.id), d + 1);
    }
  };
  await achar(blocos);

  const paginasDeDentro = [];
  for (const db of bases) paginasDeDentro.push(...((await linhas(db.id)) ?? []));
  if (paginasDeDentro.length && profundidade < 4) {
    const filhosLidos = [];
    for (const p of paginasDeDentro) filhosLidos.push(await material(p, profundidade + 1));
    return { ...base, tipo: 'grupo', filhos: ordenar(filhosLidos) };
  }

  // Tabela (Carteira) e vídeos/links ficam para a fase 2, como conteúdo.
  const tipos = new Set();
  const coletar = async (lista, d = 0) => { for (const b of lista) { tipos.add(b.type); if (b.has_children && d < 2 && !['child_page', 'child_database'].includes(b.type)) await coletar(await filhos(b.id), d + 1); } };
  await coletar(blocos);
  if (tipos.has('table')) return { ...base, tipo: 'conteudo' };

  const perguntas = await perguntasDe(pagina.id);
  const respondiveis = perguntas.filter((p) => p.tipo !== 'aviso').length;
  const temMidia = ['embed', 'video', 'bookmark'].some((t) => tipos.has(t));
  if (respondiveis > 0 && !(temMidia && respondiveis <= 3)) return { ...base, tipo: 'formulario', perguntas };
  return { ...base, tipo: 'conteudo' };
}

const ehPre = (n) => /^pre[-\s]?sessao/.test(normal(n));
const ordenar = (lista) => [...lista].sort((a, b) => Number(!ehPre(a.nome)) - Number(!ehPre(b.nome)) || a.nome.localeCompare(b.nome, 'pt-BR'));

async function lerModelo(paginaTutorias) {
  const pilares = [];
  const atual = () => pilares[pilares.length - 1];
  const tutoriasPendentes = []; // [pilar, fonte]

  const visitar = async (lista, iconeDoCallout) => {
    for (const b of lista) {
      const t = texto(b);
      const tituloDePilar = /^pilar\b/i.test(t) && !(b[b.type] ?? {}).is_toggleable && b.type !== 'toggle';
      if (b.type === 'callout') {
        if (normal(t) === 'tutorias do hub') continue;
        const ic = icone(b.callout.icon);
        if (tituloDePilar) pilares.push({ nome: t.replace(/^pilar:\s*/i, ''), icone: ic, frase: [], tutorias: [] });
        if (b.has_children) await visitar(await filhos(b.id), ic);
      } else if (tituloDePilar) {
        pilares.push({ nome: t.replace(/^pilar:\s*/i, ''), icone: iconeDoCallout, frase: [], tutorias: [] });
      } else if (!atual()) {
        continue;
      } else if (b.type === 'quote' && !atual().frase.length) {
        atual().frase = pedacos(b);
      } else if (b.type === 'toggle' || (b.type.startsWith('heading') && b[b.type].is_toggleable)) {
        if (t) tutoriasPendentes.push([atual(), { nome: semTutoria(t), icone: null, containerId: b.id }]);
      } else if (b.type === 'child_database') {
        for (const c of (await linhas(b.id)) ?? []) {
          tutoriasPendentes.push([atual(), { nome: semTutoria(tituloDe(c)), icone: icone(c.icon), containerId: c.id }]);
        }
      }
    }
  };
  await visitar(await filhos(paginaTutorias), null);

  // Dentro de cada tutoria: callouts com uma base de materiais (a de "Sessões" fica de fora).
  for (const [pilar, fonte] of tutoriasPendentes) {
    const materiais = [];
    for (const callout of (await filhos(fonte.containerId)).filter((b) => b.type === 'callout' && b.has_children)) {
      if (/^sess/i.test(normal(texto(callout)))) continue;
      for (const db of (await filhos(callout.id)).filter((b) => b.type === 'child_database')) {
        for (const p of (await linhas(db.id)) ?? []) materiais.push(await material(p));
      }
    }
    pilar.tutorias.push({ nome: fonte.nome, icone: fonte.icone, materiais: ordenar(materiais) });
  }
  // Tutorias na ordem em que a frase do pilar as cita ("produto, posicionamento,
  // processos e pessoas"); o que a frase não cita vai para o fim.
  for (const p of pilares) {
    const frase = normal(p.frase.map((f) => f.texto).join(''));
    const pos = (nome) => { const i = frase.indexOf(normal(nome).split(' ')[0]); return i === -1 ? Infinity : i; };
    p.tutorias.sort((a, b) => pos(a.nome) - pos(b.nome));
  }
  return pilares;
}

// --- Mostrar / gravar --------------------------------------------------------

function mostrar(pilares) {
  const linhaMat = (m, ind) => {
    const extra = m.tipo === 'formulario' ? ` — ${m.perguntas.filter((p) => p.tipo !== 'aviso').length} perguntas (${['texto', 'opcoes', 'arquivo', 'aviso'].map((t) => `${t}:${m.perguntas.filter((p) => p.tipo === t).length}`).join(' ')})` : '';
    console.log(`${ind}- [${m.tipo}] ${m.nome}${extra}`);
    for (const f of m.filhos) linhaMat(f, ind + '    ');
  };
  for (const p of pilares) {
    console.log(`\nPILAR ${p.nome}  frase: ${p.frase.map((f) => f.texto).join('').slice(0, 60)}…`);
    for (const t of p.tutorias) { console.log(`  TUTORIA ${t.nome}`); for (const m of t.materiais) linhaMat(m, '    '); }
  }
}

async function gravar(pilares) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const ok = (r, onde) => { if (r.error) throw new Error(`${onde}: ${r.error.message}`); return r.data; };

  // Modelo novo substitui o anterior (as respostas caem junto, por cascata —
  // por isso só rode antes de alguém começar a responder).
  ok(await db.from('tutoria_pilares').delete().neq('id', '00000000-0000-0000-0000-000000000000'), 'limpar');

  const gravarMaterial = async (m, tutoriaId, paiId, ordem) => {
    const [linha] = ok(await db.from('tutoria_materiais').insert({ tutoria_id: tutoriaId, pai_id: paiId, nome: m.nome, icone: m.icone, tipo: m.tipo, ordem }).select('id'), 'material');
    if (m.perguntas.length) {
      ok(await db.from('tutoria_perguntas').insert(m.perguntas.map((p, i) => ({ material_id: linha.id, secao: p.secao, texto: p.texto, ajuda: p.ajuda, tipo: p.tipo, opcoes: p.opcoes, ordem: i }))), 'perguntas');
    }
    for (const [i, f] of m.filhos.entries()) await gravarMaterial(f, tutoriaId, linha.id, i);
  };

  for (const [i, p] of pilares.entries()) {
    const [pilar] = ok(await db.from('tutoria_pilares').insert({ nome: p.nome, frase: p.frase, icone: p.icone, ordem: i }).select('id'), 'pilar');
    for (const [j, t] of p.tutorias.entries()) {
      const [tutoria] = ok(await db.from('tutoria_tutorias').insert({ pilar_id: pilar.id, nome: t.nome, icone: t.icone, ordem: j }).select('id'), 'tutoria');
      for (const [k, m] of t.materiais.entries()) await gravarMaterial(m, tutoria.id, null, k);
    }
  }
  console.log('\nModelo gravado.');
}

const pilares = await lerModelo(String(args.pagina));
mostrar(pilares);
if (args.gravar) await gravar(pilares);

if (args.detalhe) {
  const achar = (ms) => ms.flatMap((m) => [m, ...achar(m.filhos)]);
  for (const p of pilares) for (const t of p.tutorias) for (const m of achar(t.materiais)) {
    if (m.tipo === 'formulario' && normal(`${t.nome} ${m.nome}`).includes(normal(String(args.detalhe)))) {
      console.log(`\n== ${t.nome} > ${m.nome}`);
      for (const q of m.perguntas) console.log(`  [${q.tipo}] ${q.secao ? `(${q.secao}) ` : ''}${q.texto}${q.opcoes.length ? ` {${q.opcoes.join(' | ')}}` : ''}${q.ajuda ? ` ~ ${q.ajuda.replace(/\n/g, ' / ')}` : ''}`);
    }
  }
}
