import type { NotionPage, NotionProperty } from './client';

type RichText = { plain_text?: string };

function juntar(rt: unknown): string {
  if (!Array.isArray(rt)) return '';
  return (rt as RichText[]).map((t) => t.plain_text ?? '').join('').trim();
}

/**
 * Lê uma propriedade como texto, aceitando qualquer tipo.
 *
 * Fórmula e rollup são os casos chatos: a mesma propriedade pode voltar como
 * número cru (1000), como string já formatada ("R$ 1.000,00") ou como array de
 * valores. Os três caminhos caem aqui.
 */
export function texto(page: NotionPage, nome: string): string {
  const p = page.properties?.[nome];
  return textoDeProp(p);
}

function textoDeProp(p: NotionProperty | undefined): string {
  if (!p) return '';

  switch (p.type) {
    case 'title':
      return juntar(p.title);
    case 'rich_text':
      return juntar(p.rich_text);
    case 'select':
      return (p.select as { name?: string } | null)?.name ?? '';
    case 'status':
      return (p.status as { name?: string } | null)?.name ?? '';
    case 'multi_select':
      return ((p.multi_select as { name: string }[]) ?? []).map((o) => o.name).join(', ');
    case 'number':
      return p.number === null || p.number === undefined ? '' : String(p.number);
    case 'date':
      return (p.date as { start?: string } | null)?.start ?? '';
    case 'checkbox':
      return p.checkbox ? 'Sim' : 'Não';
    case 'url':
    case 'email':
    case 'phone_number':
      return (p[p.type] as string | null) ?? '';
    case 'people':
      return ((p.people as { name?: string }[]) ?? []).map((u) => u.name ?? '').join(', ');
    case 'created_time':
    case 'last_edited_time':
      return (p[p.type] as string) ?? '';
    case 'formula':
      return textoDeFormula(p.formula);
    case 'rollup':
      return textoDeRollup(p.rollup);
    case 'relation':
      // O título dos relacionados não vem na resposta — só os IDs.
      // Quem precisa do nome resolve com `resolverRelations`.
      return '';
    default:
      return '';
  }
}

function textoDeFormula(f: unknown): string {
  if (!f || typeof f !== 'object') return '';
  const formula = f as { type?: string; string?: string; number?: number; boolean?: boolean; date?: { start?: string } };
  switch (formula.type) {
    case 'string':
      return formula.string ?? '';
    case 'number':
      return formula.number === null || formula.number === undefined ? '' : String(formula.number);
    case 'boolean':
      return formula.boolean ? 'Sim' : 'Não';
    case 'date':
      return formula.date?.start ?? '';
    default:
      return '';
  }
}

function textoDeRollup(r: unknown): string {
  if (!r || typeof r !== 'object') return '';
  const rollup = r as { type?: string; number?: number; date?: { start?: string }; array?: NotionProperty[] };
  switch (rollup.type) {
    case 'number':
      return rollup.number === null || rollup.number === undefined ? '' : String(rollup.number);
    case 'date':
      return rollup.date?.start ?? '';
    case 'array':
      // Um rollup de array vira uma lista de propriedades — cada item pode ser
      // de um tipo diferente, então cada um passa pelo mesmo tratamento.
      return (rollup.array ?? [])
        .map((item) => textoDeProp(item))
        .filter(Boolean)
        .join(', ');
    default:
      return '';
  }
}

/** Mesma tolerância, mas devolvendo número quando dá — inclusive de "R$ 1.000,00". */
export function numero(page: NotionPage, nome: string): number | null {
  const p = page.properties?.[nome];
  if (!p) return null;
  if (p.type === 'number' && typeof p.number === 'number') return p.number;

  const t = textoDeProp(p);
  if (!t) return null;

  // "R$ 1.234,56" -> 1234.56 ; "1,234.56" -> 1234.56
  const limpo = t.replace(/[^\d,.-]/g, '');
  const brasileiro = /,\d{1,2}$/.test(limpo);
  const normalizado = brasileiro
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo.replace(/,/g, '');

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** IDs das páginas ligadas por uma relation. */
export function relationIds(page: NotionPage, nome: string): string[] {
  const p = page.properties?.[nome];
  if (!p || p.type !== 'relation') return [];
  return ((p.relation as { id: string }[]) ?? []).map((r) => r.id);
}

export function data(page: NotionPage, nome: string): string | null {
  const t = texto(page, nome);
  return t || null;
}

/** Título da página (a propriedade `title`, tenha o nome que tiver). */
export function titulo(page: NotionPage): string {
  for (const p of Object.values(page.properties ?? {})) {
    if (p.type === 'title') return juntar(p.title);
  }
  return '';
}

export function formatarData(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
