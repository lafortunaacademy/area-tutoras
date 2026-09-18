import 'server-only';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { pergunta as lerPergunta, type Pergunta } from './modelo';

/**
 * Respostas das mentoradas às perguntas das tutorias. Uma linha por mentorada
 * e pergunta. Os anexos ficam no armazenamento do Supabase (bucket privado
 * "tutorias"), e o navegador só recebe links assinados que expiram.
 *
 * Quem chama já conferiu quem pode ler e escrever (ver `acesso.ts`).
 */

export const BUCKET = 'tutorias';
const VALIDADE_DO_LINK_S = 60 * 60;

export type Anexo = { caminho: string; nome: string; tipo: string; url?: string };
export type Valor = { texto?: string; opcoes?: string[]; arquivos?: Anexo[] };

/** Respostas da mentorada num material, por pergunta. Anexos já com link assinado. */
export async function respostasDoMaterial(mentoradaId: string, perguntaIds: string[]): Promise<Record<string, Valor>> {
  if (!perguntaIds.length) return {};
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('tutoria_respostas')
    .select('pergunta_id, valor')
    .eq('mentorada_id', normalizarId(mentoradaId))
    .in('pergunta_id', perguntaIds);
  if (error) throw new Error(error.message);

  const respostas: Record<string, Valor> = {};
  for (const r of data ?? []) respostas[r.pergunta_id] = r.valor as Valor;

  const caminhos = Object.values(respostas).flatMap((v) => (v.arquivos ?? []).map((a) => a.caminho));
  if (caminhos.length) {
    const { data: links } = await db.storage.from(BUCKET).createSignedUrls(caminhos, VALIDADE_DO_LINK_S);
    const porCaminho = new Map((links ?? []).map((l) => [l.path, l.signedUrl]));
    for (const v of Object.values(respostas)) {
      for (const a of v.arquivos ?? []) a.url = porCaminho.get(a.caminho) ?? undefined;
    }
  }
  return respostas;
}

/** Quantas perguntas de cada material a mentorada já respondeu. */
export async function progressoDaMentorada(mentoradaId: string): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin()
    .from('tutoria_respostas')
    .select('valor, tutoria_perguntas!inner(material_id)')
    .eq('mentorada_id', normalizarId(mentoradaId));
  if (error) throw new Error(error.message);

  const feitas: Record<string, number> = {};
  for (const r of data ?? []) {
    if (!temConteudo(r.valor as Valor)) continue;
    const materialId = (r.tutoria_perguntas as unknown as { material_id: string }).material_id;
    feitas[materialId] = (feitas[materialId] ?? 0) + 1;
  }
  return feitas;
}

const temConteudo = (v: Valor) => Boolean(v.texto?.trim() || v.opcoes?.length || v.arquivos?.length);

/**
 * Grava texto ou opções. A pergunta é lida de novo aqui: o tipo e as opções que
 * valem são os do modelo, não os que o navegador mandou.
 */
export async function salvarResposta(
  mentoradaId: string,
  perguntaId: string,
  valor: { texto?: string; opcoes?: string[] },
  quem: string,
): Promise<Pergunta | null> {
  const p = await lerPergunta(perguntaId);
  if (!p) return null;

  let novo: Valor;
  if (p.tipo === 'texto' && typeof valor.texto === 'string') {
    novo = { texto: valor.texto.slice(0, 20_000) };
  } else if (p.tipo === 'opcoes' && Array.isArray(valor.opcoes)) {
    novo = { opcoes: valor.opcoes.filter((o) => p.opcoes.includes(o)) };
  } else {
    return null;
  }

  const { error } = await supabaseAdmin()
    .from('tutoria_respostas')
    .upsert(
      { mentorada_id: normalizarId(mentoradaId), pergunta_id: p.id, valor: novo, atualizado_em: new Date().toISOString(), atualizado_por: quem },
      { onConflict: 'mentorada_id,pergunta_id' },
    );
  if (error) throw new Error(error.message);
  return p;
}

/** Anexa um arquivo numa pergunta do tipo arquivo. Devolve o anexo já com link. */
export async function anexarArquivo(mentoradaId: string, perguntaId: string, arquivo: File, quem: string): Promise<Anexo | null> {
  const p = await lerPergunta(perguntaId);
  if (!p || p.tipo !== 'arquivo') return null;

  const db = supabaseAdmin();
  const id = normalizarId(mentoradaId);
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80) || 'arquivo';
  const caminho = `${id}/${p.id}/${randomUUID()}-${nomeSeguro}`;

  const envio = await db.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream' });
  if (envio.error) throw new Error(envio.error.message);

  const anexo: Anexo = { caminho, nome: arquivo.name, tipo: arquivo.type };
  const { data: atual } = await db.from('tutoria_respostas').select('valor').eq('mentorada_id', id).eq('pergunta_id', p.id).maybeSingle();
  const arquivos = [...(((atual?.valor as Valor | undefined)?.arquivos) ?? []), anexo];

  const { error } = await db
    .from('tutoria_respostas')
    .upsert(
      { mentorada_id: id, pergunta_id: p.id, valor: { arquivos }, atualizado_em: new Date().toISOString(), atualizado_por: quem },
      { onConflict: 'mentorada_id,pergunta_id' },
    );
  if (error) throw new Error(error.message);

  const { data: link } = await db.storage.from(BUCKET).createSignedUrl(caminho, VALIDADE_DO_LINK_S);
  return { ...anexo, url: link?.signedUrl };
}

/** Tira um anexo da resposta e apaga o arquivo. */
export async function removerArquivo(mentoradaId: string, perguntaId: string, caminho: string, quem: string): Promise<boolean> {
  const db = supabaseAdmin();
  const id = normalizarId(mentoradaId);
  // O caminho vem do navegador: só vale se for desta mentorada e desta pergunta.
  if (!caminho.startsWith(`${id}/${perguntaId}/`)) return false;

  const { data: atual } = await db.from('tutoria_respostas').select('valor').eq('mentorada_id', id).eq('pergunta_id', perguntaId).maybeSingle();
  const arquivos = (((atual?.valor as Valor | undefined)?.arquivos) ?? []).filter((a) => a.caminho !== caminho);

  const { error } = await db
    .from('tutoria_respostas')
    .upsert(
      { mentorada_id: id, pergunta_id: perguntaId, valor: { arquivos }, atualizado_em: new Date().toISOString(), atualizado_por: quem },
      { onConflict: 'mentorada_id,pergunta_id' },
    );
  if (error) throw new Error(error.message);
  await db.storage.from(BUCKET).remove([caminho]);
  return true;
}
