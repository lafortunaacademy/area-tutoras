import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBlockChildren } from './client';
import { carteiraDaTutora, type Mentorada } from './carteira';
import { AREA_DE_MEMBROS } from './config';

/**
 * Quem já está no modelo novo da área de membros.
 *
 * "Área clientes" não tem campo que diga isso, então o sinal é a própria página:
 * o modelo novo começa com o callout "Área de membros". Olhar é uma chamada por
 * mentorada, e são dezenas — por isso a resposta fica anotada em
 * `notion_resolved_ids` (só a marca "novo"/"antigo", nenhum conteúdo).
 *
 * "Novo" vale para sempre: ninguém volta para o modelo antigo. "Antigo" é
 * conferido de novo depois de algumas horas, para quem migrar aparecer sem
 * ninguém precisar fazer nada.
 */

const RECONFERIR_ANTIGO_MS = 6 * 60 * 60 * 1000;
/** A API do Notion aguenta ~3 requisições por segundo; acima disso vira fila de 429. */
const EM_PARALELO = 3;

const chave = (mentoradaId: string) => `modelo:${mentoradaId}`;

export const mentoradasDoModeloNovo = cache(async (): Promise<Mentorada[]> => {
  const todas = await carteiraDaTutora();
  const db = supabaseAdmin();

  const { data: marcas } = await db
    .from('notion_resolved_ids')
    .select('section_key, notion_id, resolved_at')
    .like('section_key', 'modelo:%');

  const conhecidas = new Map(
    (marcas ?? []).map((m) => [
      m.section_key.slice('modelo:'.length),
      { novo: m.notion_id === 'novo', em: new Date(m.resolved_at).getTime() },
    ]),
  );

  const agora = Date.now();
  const pendentes = todas.filter((m) => {
    const k = conhecidas.get(m.id);
    return !k || (!k.novo && agora - k.em > RECONFERIR_ANTIGO_MS);
  });

  await emLotes(pendentes, EM_PARALELO, async (m) => {
    // Se o Notion falhar, a mentorada fica de fora só desta vez — sem anotar
    // nada, para a próxima visita tentar de novo.
    const novo = await temAreaDeMembros(m.id).catch(() => null);
    if (novo === null) return;
    conhecidas.set(m.id, { novo, em: agora });
    await db.from('notion_resolved_ids').upsert({
      section_key: chave(m.id),
      notion_id: novo ? 'novo' : 'antigo',
      resolved_at: new Date(agora).toISOString(),
    });
  });

  return todas.filter((m) => conhecidas.get(m.id)?.novo);
});

async function temAreaDeMembros(mentoradaId: string): Promise<boolean> {
  const blocos = await getBlockChildren(mentoradaId);
  return blocos.some((b) => {
    if (b.type !== 'callout') return false;
    const texto = ((b.callout as { rich_text?: { plain_text?: string }[] })?.rich_text ?? [])
      .map((t) => t.plain_text ?? '')
      .join('')
      .trim()
      .toLowerCase();
    return texto === AREA_DE_MEMBROS.callout.toLowerCase();
  });
}

async function emLotes<T>(itens: T[], tamanho: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < itens.length; i += tamanho) {
    await Promise.all(itens.slice(i, i + tamanho).map(fn));
  }
}
