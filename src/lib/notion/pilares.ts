import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBlockChildren, NotionError, queryDatabase, type NotionBlock } from './client';
import { AREA_DE_MEMBROS, TEMAS_DE_TUTORIA } from './config';
import { normalizarId, type Mentorada } from './carteira';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { especialidadesDasTutoras } from './hub';
import { titulo } from './props';
import { sessoesPorCiclo, type SessaoDaLista } from './sessoesDaMentorada';

/**
 * Os pilares da página Tutorias da mentorada (Líder, Dinheiro, Negócio), cada
 * um com a frase e as tutorias dele. Somente leitura.
 *
 * O Notion aceita dois jeitos, e os dois valem:
 * - novo: título "Pilar: …", a frase e, num callout, um toggle por tutoria
 *   ("Tutorias terapêuticas") com os callouts dela dentro;
 * - antigo: callout "Pilar: …" com a frase e uma base de cartões, cada cartão
 *   uma página com os mesmos callouts dentro.
 * Nos callouts de cada tutoria, a base comum vira galeria de materiais e a de
 * "Sessões…" (uma visualização da base de sessões) vira a tabela das sessões
 * da mentorada naquele tema.
 */

export type IconeNotion = { tipo: 'url'; url: string } | { tipo: 'emoji'; emoji: string } | null;

export type ItemDeMaterial = { id: string; titulo: string; icone: IconeNotion };

export type ParteDaTutoria =
  | { tipo: 'materiais'; id: string; titulo: string; icone: IconeNotion; itens: ItemDeMaterial[] }
  | { tipo: 'sessoes'; id: string; titulo: string; icone: IconeNotion; sessoes: SessaoDaLista[] };

export type TutoriaDoPilar = { id: string; titulo: string; icone: IconeNotion; partes: ParteDaTutoria[] };

export type Pilar = {
  id: string;
  titulo: string;
  icone: IconeNotion;
  /** A frase do pilar, com o trecho em negrito separado. */
  frase: { texto: string; negrito: boolean }[];
  tutorias: TutoriaDoPilar[];
};

type RichText = { plain_text?: string; annotations?: { bold?: boolean } };

type Contexto = { sessoes: SessaoDaLista[]; especialidades: Map<string, string[]> };

const chave = (mentoradaId: string) => `tutorias-pagina:${mentoradaId}`;

export async function pilaresDaMentorada(mentorada: Mentorada): Promise<Pilar[] | null> {
  const pagina = await paginaDeTutorias(mentorada.id);
  if (!pagina) return null;

  const [blocos, todas, especialidades] = await Promise.all([
    getBlockChildren(pagina).catch(async (erro) => {
      const sumiu = erro instanceof NotionError && (erro.status === 404 || erro.code === 'object_not_found');
      if (!sumiu) throw erro;
      const nova = await paginaDeTutorias(mentorada.id, true);
      return nova ? getBlockChildren(nova) : [];
    }),
    sessoesPorCiclo(mentorada),
    especialidadesDasTutoras(),
  ]);
  const ctx: Contexto = { sessoes: todas.sessoes, especialidades };

  // Primeiro monta o esqueleto (quem é pilar, frase, onde está cada tutoria);
  // depois lê as tutorias todas em paralelo.
  const esqueleto: { pilar: Omit<Pilar, 'tutorias'>; fontes: FonteDeTutoria[] }[] = [];
  const atual = () => esqueleto[esqueleto.length - 1];
  const novoPilar = (id: string, titulo: string, icone: IconeNotion) =>
    esqueleto.push({ pilar: { id, titulo, icone, frase: [] }, fontes: [] });

  const visitar = async (lista: NotionBlock[], iconeDoCallout: IconeNotion) => {
    for (const b of lista) {
      const texto = juntar(conteudo(b).rich_text);
      const ehTituloDePilar = /^pilar\b/i.test(texto) && !b.type.startsWith('toggle') && !conteudo(b).is_toggleable;

      if (b.type === 'callout') {
        if (ehCallout(b, AREA_DE_MEMBROS.calloutHub)) continue;
        const icone = iconeDe((b.callout as { icon?: unknown })?.icon);
        if (ehTituloDePilar) novoPilar(b.id, texto, icone);
        if (b.has_children) await visitar(await getBlockChildren(b.id), icone);
      } else if (ehTituloDePilar) {
        novoPilar(b.id, texto, iconeDoCallout);
      } else if (!atual()) {
        continue;
      } else if (b.type === 'quote' && !atual().pilar.frase.length) {
        atual().pilar.frase = (conteudo(b).rich_text ?? [])
          .map((t) => ({ texto: t.plain_text ?? '', negrito: Boolean(t.annotations?.bold) }))
          .filter((t) => t.texto);
      } else if (b.type === 'toggle' || (b.type.startsWith('heading') && conteudo(b).is_toggleable)) {
        if (texto) atual().fontes.push({ id: b.id, titulo: texto, icone: null });
      } else if (b.type === 'child_database') {
        // Jeito antigo: cada cartão da base é uma tutoria.
        const cartoes = await queryDatabase(b.id, { limite: 50 }).catch(() => []);
        for (const c of cartoes) {
          const nome = titulo(c).split('|')[0].trim();
          if (nome) atual().fontes.push({ id: c.id, titulo: nome, icone: iconeDe(c.icon) });
        }
      }
    }
  };
  await visitar(blocos, null);

  return Promise.all(
    esqueleto.map(async ({ pilar, fontes }) => {
      const frase = pilar.frase.map((t) => t.texto).join('').toLowerCase();
      const ordenadas = [...fontes].sort(
        (a, b) => posicaoNaFrase(a.titulo, frase) - posicaoNaFrase(b.titulo, frase),
      );
      return { ...pilar, tutorias: await Promise.all(ordenadas.map((f) => lerTutoria(f, ctx))) };
    }),
  );
}

type FonteDeTutoria = { id: string; titulo: string; icone: IconeNotion };

async function lerTutoria(fonte: FonteDeTutoria, ctx: Contexto): Promise<TutoriaDoPilar> {
  const callouts = (await getBlockChildren(fonte.id).catch(() => [])).filter((b) => b.type === 'callout' && b.has_children);

  const partes = await Promise.all(
    callouts.map(async (callout): Promise<ParteDaTutoria | null> => {
      const filhos = await getBlockChildren(callout.id);
      const base = filhos.find((b) => b.type === 'child_database');
      if (!base) return null;

      const paragrafo = filhos.find((b) => b.type === 'paragraph' && juntar(conteudo(b).rich_text));
      const tituloDaParte =
        juntar(conteudo(callout).rich_text) || (paragrafo ? juntar(conteudo(paragrafo).rich_text) : '') || (base.child_database as { title?: string })?.title?.trim() || '';
      const icone = iconeDe((callout.callout as { icon?: unknown })?.icon);

      if (normal(tituloDaParte).startsWith('sessoes')) {
        return { tipo: 'sessoes', id: callout.id, titulo: tituloDaParte, icone, sessoes: sessoesDoTema(fonte.titulo, ctx) };
      }

      const linhas = await queryDatabase(base.id, { limite: 50 }).catch(() => null);
      if (!linhas) return null;
      return {
        tipo: 'materiais',
        id: callout.id,
        titulo: tituloDaParte,
        icone,
        itens: linhas
          .map((p) => ({ id: p.id, titulo: titulo(p).split('|')[0].trim(), icone: iconeDe(p.icon) }))
          .filter((i) => i.titulo)
          // A pré-sessão vem antes de tudo, como no Notion; o resto em ordem alfabética.
          .sort((a, b) => Number(!ehPreSessao(a.titulo)) - Number(!ehPreSessao(b.titulo)) || a.titulo.localeCompare(b.titulo, 'pt-BR')),
      };
    }),
  );

  return { ...fonte, partes: partes.filter((p): p is ParteDaTutoria => p !== null) };
}

/** As sessões da mentorada no tema da tutoria, na ordem da visualização do Notion. */
function sessoesDoTema(tituloDaTutoria: string, ctx: Contexto): SessaoDaLista[] {
  const tema = TEMAS_DE_TUTORIA.find((t) => normal(tituloDaTutoria).includes(t.trecho));
  if (!tema) return [];
  const temas = new Set(tema.temas.map(normal));
  const especialidades = new Set(tema.especialidades.map(normal));

  return ctx.sessoes
    .filter(
      (s) =>
        temas.has(normal(s.tema)) ||
        s.tutoraIds.some((id) => (ctx.especialidades.get(normalizarId(id)) ?? []).some((e) => especialidades.has(normal(e)))),
    )
    .sort(
      (a, b) =>
        ordemDoMes(a.mesPrevisto) - ordemDoMes(b.mesPrevisto) ||
        (a.dataRealizada ?? '9999').localeCompare(b.dataRealizada ?? '9999') ||
        a.sessao.localeCompare(b.sessao, 'pt-BR', { numeric: true }),
    );
}

const ehPreSessao = (t: string) => normal(t).startsWith('pre-sessao') || normal(t).startsWith('pre sessao');

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function ordemDoMes(mes: string): number {
  if (!mes) return 99;
  const numero = mes.match(/\d{1,2}/);
  if (numero && Number(numero[0]) >= 1 && Number(numero[0]) <= 12) return Number(numero[0]);
  const i = MESES.findIndex((m) => normal(mes).includes(m));
  return i === -1 ? 98 : i + 1;
}

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

/**
 * A ordem dos cartões segue a frase do pilar ("produto, posicionamento,
 * processos e pessoas"), que é a ordem do Notion; o que a frase não cita vai
 * para o fim.
 */
function posicaoNaFrase(tituloDoCartao: string, frase: string): number {
  const palavras = tituloDoCartao
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 3 && !p.startsWith('tutoria'));
  const posicoes = palavras.map((p) => frase.indexOf(p)).filter((i) => i >= 0);
  return posicoes.length ? Math.min(...posicoes) : Number.MAX_SAFE_INTEGER;
}

function iconeDe(bruto: unknown): IconeNotion {
  const i = bruto as
    | { type: 'emoji'; emoji: string }
    | { type: 'icon'; icon: { name: string; color?: string } }
    | { type: 'external'; external: { url: string } }
    | { type: 'file'; file: { url: string } }
    | null
    | undefined;
  if (!i) return null;
  if (i.type === 'emoji') return { tipo: 'emoji', emoji: i.emoji };
  // Ícones nativos do Notion: o SVG é público, pelo nome e pela cor.
  if (i.type === 'icon') return { tipo: 'url', url: `https://www.notion.so/icons/${i.icon.name}_${i.icon.color ?? 'gray'}.svg` };
  if (i.type === 'external') return { tipo: 'url', url: i.external.url };
  if (i.type === 'file') return { tipo: 'url', url: i.file.url };
  return null;
}

const conteudo = (b: NotionBlock) => (b[b.type] ?? {}) as { rich_text?: RichText[]; is_toggleable?: boolean };
const juntar = (rt: RichText[] | undefined) => (rt ?? []).map((t) => t.plain_text ?? '').join('').trim();

/** A página "Tutorias" da área de membros, entre os cartões da área da mentorada. */
async function paginaDeTutorias(mentoradaId: string, redescobrir = false): Promise<string | null> {
  const db = supabaseAdmin();
  if (!redescobrir) {
    const { data: salva } = await db
      .from('notion_resolved_ids')
      .select('notion_id')
      .eq('section_key', chave(mentoradaId))
      .maybeSingle();
    if (salva?.notion_id) return salva.notion_id;
  }

  const area = await paginaDaAreaDeMembros(mentoradaId);
  const callout = area ? await acharFilho(area, (b) => ehCallout(b, AREA_DE_MEMBROS.calloutCartoes)) : null;
  const base = callout ? await acharFilho(callout.id, (b) => b.type === 'child_database') : null;
  if (!base) return null;

  const cartoes = await queryDatabase(base.id, { limite: 50 });
  const tutorias = cartoes.find((c) => titulo(c).trim().toLowerCase() === AREA_DE_MEMBROS.cartaoTutorias.toLowerCase());
  if (!tutorias) return null;

  await db
    .from('notion_resolved_ids')
    .upsert({ section_key: chave(mentoradaId), notion_id: tutorias.id, resolved_at: new Date().toISOString() });
  return tutorias.id;
}
