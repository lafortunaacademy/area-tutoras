import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBlockChildren, NotionError, queryDatabase, type NotionBlock } from './client';
import { AREA_DE_MEMBROS } from './config';
import { acharFilho, ehCallout, paginaDaAreaDeMembros } from './gestao';
import { titulo } from './props';

/**
 * Os pilares da página Tutorias da mentorada (Líder, Dinheiro, Negócio): cada
 * um é um callout com uma frase e uma base de cartões. Somente leitura.
 *
 * O título do pilar às vezes está no próprio callout, às vezes num parágrafo
 * logo dentro dele ("Pilar: Líder") — os dois jeitos valem.
 */

export type IconeNotion = { tipo: 'url'; url: string } | { tipo: 'emoji'; emoji: string } | null;

export type CartaoDoPilar = { id: string; titulo: string; icone: IconeNotion };

export type Pilar = {
  id: string;
  titulo: string;
  icone: IconeNotion;
  /** A frase do pilar, com o trecho em negrito separado. */
  frase: { texto: string; negrito: boolean }[];
  cartoes: CartaoDoPilar[];
};

type RichText = { plain_text?: string; annotations?: { bold?: boolean } };

const chave = (mentoradaId: string) => `tutorias-pagina:${mentoradaId}`;

export async function pilaresDaMentorada(mentoradaId: string): Promise<Pilar[] | null> {
  const pagina = await paginaDeTutorias(mentoradaId);
  if (!pagina) return null;

  let blocos: NotionBlock[];
  try {
    blocos = await getBlockChildren(pagina);
  } catch (erro) {
    const sumiu = erro instanceof NotionError && (erro.status === 404 || erro.code === 'object_not_found');
    if (!sumiu) throw erro;
    const nova = await paginaDeTutorias(mentoradaId, true);
    if (!nova) return null;
    blocos = await getBlockChildren(nova);
  }

  const pilares = await Promise.all(
    blocos
      .filter((b) => b.type === 'callout' && b.has_children && !ehCallout(b, AREA_DE_MEMBROS.calloutHub))
      .map(lerPilar),
  );
  return pilares.filter((p): p is Pilar => p !== null);
}

async function lerPilar(callout: NotionBlock): Promise<Pilar | null> {
  const filhos = await getBlockChildren(callout.id);
  const base = filhos.find((b) => b.type === 'child_database');
  if (!base) return null;

  const tituloDoCallout = juntar(conteudo(callout).rich_text);
  const paragrafo = filhos.find((b) => b.type === 'paragraph' && juntar(conteudo(b).rich_text));
  const tituloDoPilar = tituloDoCallout || (paragrafo ? juntar(conteudo(paragrafo).rich_text) : '');

  const citacao = filhos.find((b) => b.type === 'quote');
  const frase = ((citacao ? conteudo(citacao).rich_text : []) ?? [])
    .map((t) => ({ texto: t.plain_text ?? '', negrito: Boolean(t.annotations?.bold) }))
    .filter((t) => t.texto);
  const textoDaFrase = frase.map((t) => t.texto).join('').toLowerCase();

  const linhas = await queryDatabase(base.id, { limite: 50 });
  const cartoes = linhas
    // "Tutorias Produto | Nome da cliente" -> "Tutorias Produto": o nome da cliente não entra.
    .map((p) => ({ id: p.id, titulo: titulo(p).split('|')[0].trim(), icone: icone(p.icon) }))
    .filter((c) => c.titulo)
    .sort((a, b) => posicaoNaFrase(a.titulo, textoDaFrase) - posicaoNaFrase(b.titulo, textoDaFrase) || a.titulo.localeCompare(b.titulo, 'pt-BR'));

  return { id: callout.id, titulo: tituloDoPilar, icone: icone((callout.callout as { icon?: unknown })?.icon), frase, cartoes };
}

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

function icone(bruto: unknown): IconeNotion {
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

const conteudo = (b: NotionBlock) => (b[b.type] ?? {}) as { rich_text?: RichText[] };
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
