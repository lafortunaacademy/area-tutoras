import 'server-only';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { pergunta as lerPergunta, type Pergunta } from './modelo';

/**
 * Respostas das mentoradas aos formulários das tutorias.
 *
 * Um formulário pode ser respondido várias vezes (uma pré-sessão por sessão):
 * cada preenchimento é um envio. Enquanto não é enviado, o envio é o rascunho —
 * só existe um por mentorada e formulário, e é nele que as respostas caem.
 * Ao enviar, o próximo preenchimento começa um envio novo, em branco.
 *
 * Anexos ficam no armazenamento do Supabase (bucket privado "tutorias"); o
 * navegador só recebe links assinados que expiram.
 *
 * Quem chama já conferiu quem pode ler e escrever (ver `acesso.ts`).
 */

export const BUCKET = 'tutorias';
const VALIDADE_DO_LINK_S = 60 * 60;

export type Anexo = { caminho: string; nome: string; tipo: string; url?: string };
export type Valor = { texto?: string; opcoes?: string[]; arquivos?: Anexo[]; links?: string[] };
export type Envio = { id: string; criadoEm: string; atualizadoEm: string; enviadoEm: string | null };

export type EstadoDoFormulario = {
  /** Todos os envios, do mais novo para o mais antigo. */
  envios: Envio[];
  rascunho: { envio: Envio; respostas: Record<string, Valor> } | null;
  ultimo: { envio: Envio; respostas: Record<string, Valor> } | null;
};

type LinhaEnvio = { id: string; criado_em: string; atualizado_em: string; enviado_em: string | null };
const paraEnvio = (e: LinhaEnvio): Envio => ({ id: e.id, criadoEm: e.criado_em, atualizadoEm: e.atualizado_em, enviadoEm: e.enviado_em });

export async function enviosDe(mentoradaId: string, materialId: string): Promise<Envio[]> {
  const { data, error } = await supabaseAdmin()
    .from('tutoria_envios')
    .select('id, criado_em, atualizado_em, enviado_em')
    .eq('mentorada_id', normalizarId(mentoradaId))
    .eq('material_id', materialId)
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(paraEnvio);
}

/** Um envio, se ele for desta mentorada. Com o material, para conferir permissão. */
export async function envio(mentoradaId: string, envioId: string): Promise<(Envio & { materialId: string }) | null> {
  const { data, error } = await supabaseAdmin()
    .from('tutoria_envios')
    .select('id, material_id, criado_em, atualizado_em, enviado_em')
    .eq('id', envioId)
    .eq('mentorada_id', normalizarId(mentoradaId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...paraEnvio(data), materialId: data.material_id } : null;
}

/** Respostas de um envio, por pergunta. Anexos já com link assinado. */
export async function respostasDoEnvio(envioId: string): Promise<Record<string, Valor>> {
  const db = supabaseAdmin();
  const { data, error } = await db.from('tutoria_respostas').select('pergunta_id, valor').eq('envio_id', envioId);
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

/** O rascunho em aberto e o último envio, cada um com as respostas. */
export async function estadoDoFormulario(mentoradaId: string, materialId: string): Promise<EstadoDoFormulario> {
  const envios = await enviosDe(mentoradaId, materialId);
  const aberto = envios.find((e) => !e.enviadoEm) ?? null;
  const enviado = envios.find((e) => e.enviadoEm) ?? null;
  const [respostasAberto, respostasEnviado] = await Promise.all([
    aberto ? respostasDoEnvio(aberto.id) : null,
    enviado ? respostasDoEnvio(enviado.id) : null,
  ]);
  return {
    envios,
    rascunho: aberto && respostasAberto ? { envio: aberto, respostas: respostasAberto } : null,
    ultimo: enviado && respostasEnviado ? { envio: enviado, respostas: respostasEnviado } : null,
  };
}

const temConteudo = (v: Valor) => Boolean(v.texto?.trim() || v.opcoes?.length || v.arquivos?.length || v.links?.length);

/**
 * Quantas perguntas de cada formulário estão respondidas no envio que importa
 * agora (o rascunho, se houver; senão o último enviado), e quando foi o último envio.
 */
export type Progresso = Record<string, { feitas: number; ultimoEnvio: string | null }>;

export async function progressoDaMentorada(mentoradaId: string): Promise<Progresso> {
  const db = supabaseAdmin();
  const { data: envios, error } = await db
    .from('tutoria_envios')
    .select('id, material_id, criado_em, enviado_em')
    .eq('mentorada_id', normalizarId(mentoradaId))
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);

  // O envio que importa em cada formulário: o rascunho, se houver; senão o
  // enviado mais novo (a lista já vem do mais novo para o mais antigo).
  const escolhido = new Map<string, string>();
  const ultimoEnvio = new Map<string, string>();
  for (const e of envios ?? []) {
    if (!e.enviado_em) escolhido.set(e.material_id, e.id);
    else {
      if (!ultimoEnvio.has(e.material_id)) ultimoEnvio.set(e.material_id, e.enviado_em);
      if (!escolhido.has(e.material_id)) escolhido.set(e.material_id, e.id);
    }
  }

  const ids = [...escolhido.values()];
  const feitas = new Map<string, number>();
  if (ids.length) {
    const { data: respostas, error: erro } = await db.from('tutoria_respostas').select('envio_id, valor').in('envio_id', ids);
    if (erro) throw new Error(erro.message);
    for (const r of respostas ?? []) {
      if (temConteudo(r.valor as Valor)) feitas.set(r.envio_id, (feitas.get(r.envio_id) ?? 0) + 1);
    }
  }

  const resultado: Progresso = {};
  for (const [materialId, envioId] of escolhido) {
    resultado[materialId] = { feitas: feitas.get(envioId) ?? 0, ultimoEnvio: ultimoEnvio.get(materialId) ?? null };
  }
  return resultado;
}

/** O rascunho em aberto deste formulário; sem ele, cria um. */
async function rascunho(mentoradaId: string, materialId: string, quem: string): Promise<string> {
  const db = supabaseAdmin();
  const id = normalizarId(mentoradaId);
  const buscar = async () =>
    (
      await db
        .from('tutoria_envios')
        .select('id')
        .eq('mentorada_id', id)
        .eq('material_id', materialId)
        .is('enviado_em', null)
        .maybeSingle()
    ).data?.id as string | undefined;

  const existente = await buscar();
  if (existente) return existente;

  const { data, error } = await db
    .from('tutoria_envios')
    .insert({ mentorada_id: id, material_id: materialId, criado_por: quem })
    .select('id')
    .single();
  // Duas gravações ao mesmo tempo: o índice único deixa só um rascunho; usa o que ficou.
  if (error) {
    const outro = await buscar();
    if (outro) return outro;
    throw new Error(error.message);
  }
  return data.id;
}

/**
 * Grava texto ou opções no rascunho. A pergunta é lida de novo aqui: o tipo e
 * as opções que valem são os do modelo, não os que o navegador mandou.
 */
export async function salvarResposta(
  mentoradaId: string,
  perguntaId: string,
  valor: { texto?: string; opcoes?: string[]; links?: string[] },
  quem: string,
): Promise<Pergunta | null> {
  const p = await lerPergunta(perguntaId);
  if (!p) return null;

  let novo: Valor;
  if (p.tipo === 'texto' && typeof valor.texto === 'string') novo = { texto: valor.texto.slice(0, 20_000) };
  else if (p.tipo === 'opcoes' && Array.isArray(valor.opcoes)) novo = { opcoes: valor.opcoes.filter((o) => p.opcoes.includes(o)) };
  else if (p.tipo === 'links' && Array.isArray(valor.links)) {
    // Só endereços web de verdade: nada de "javascript:" ou texto solto virando link.
    novo = { links: valor.links.map((l) => String(l).trim()).filter((l) => /^https?:\/\/\S+$/i.test(l)).slice(0, 30) };
  }
  else return null;

  const envioId = await rascunho(mentoradaId, p.materialId, quem);
  await gravarComMentorada(envioId, mentoradaId, p.id, novo, quem);
  return p;
}

async function gravarComMentorada(envioId: string, mentoradaId: string, perguntaId: string, valor: Valor, quem: string) {
  const db = supabaseAdmin();
  const agora = new Date().toISOString();
  const { error } = await db
    .from('tutoria_respostas')
    .upsert(
      { envio_id: envioId, mentorada_id: normalizarId(mentoradaId), pergunta_id: perguntaId, valor, atualizado_em: agora, atualizado_por: quem },
      { onConflict: 'envio_id,pergunta_id' },
    );
  if (error) throw new Error(error.message);
  await db.from('tutoria_envios').update({ atualizado_em: agora }).eq('id', envioId);
}

async function valorNoRascunho(envioId: string, perguntaId: string): Promise<Valor> {
  const { data } = await supabaseAdmin()
    .from('tutoria_respostas')
    .select('valor')
    .eq('envio_id', envioId)
    .eq('pergunta_id', perguntaId)
    .maybeSingle();
  return (data?.valor as Valor | undefined) ?? {};
}

/** Anexa um arquivo numa pergunta do tipo arquivo, no rascunho. Devolve o anexo já com link. */
export async function anexarArquivo(mentoradaId: string, perguntaId: string, arquivo: File, quem: string): Promise<Anexo | null> {
  const p = await lerPergunta(perguntaId);
  if (!p || p.tipo !== 'arquivo') return null;

  const db = supabaseAdmin();
  const id = normalizarId(mentoradaId);
  const nomeSeguro = arquivo.name.normalize('NFD').replace(/[^\w.\-]+/g, '_').slice(-80) || 'arquivo';
  const caminho = `${id}/${p.id}/${randomUUID()}-${nomeSeguro}`;

  const envioArquivo = await db.storage.from(BUCKET).upload(caminho, arquivo, { contentType: arquivo.type || 'application/octet-stream' });
  if (envioArquivo.error) throw new Error(envioArquivo.error.message);

  const envioId = await rascunho(mentoradaId, p.materialId, quem);
  const anexo: Anexo = { caminho, nome: arquivo.name, tipo: arquivo.type };
  const atual = await valorNoRascunho(envioId, p.id);
  await gravarComMentorada(envioId, mentoradaId, p.id, { arquivos: [...(atual.arquivos ?? []), anexo] }, quem);

  const { data: link } = await db.storage.from(BUCKET).createSignedUrl(caminho, VALIDADE_DO_LINK_S);
  return { ...anexo, url: link?.signedUrl };
}

/** Tira um anexo do rascunho e apaga o arquivo. */
export async function removerArquivo(mentoradaId: string, perguntaId: string, caminho: string, quem: string): Promise<boolean> {
  const id = normalizarId(mentoradaId);
  // O caminho vem do navegador: só vale se for desta mentorada e desta pergunta.
  if (!caminho.startsWith(`${id}/${perguntaId}/`)) return false;
  const p = await lerPergunta(perguntaId);
  if (!p) return false;

  const envioId = await rascunho(mentoradaId, p.materialId, quem);
  const atual = await valorNoRascunho(envioId, perguntaId);
  if (!(atual.arquivos ?? []).some((a) => a.caminho === caminho)) return false;

  await gravarComMentorada(envioId, mentoradaId, perguntaId, { arquivos: (atual.arquivos ?? []).filter((a) => a.caminho !== caminho) }, quem);
  await supabaseAdmin().storage.from(BUCKET).remove([caminho]);
  return true;
}

/**
 * Envia o rascunho: ele vira a última resposta, com data, e o próximo
 * preenchimento começa em branco. Rascunho vazio não é enviado.
 */
export async function enviarRascunho(mentoradaId: string, materialId: string): Promise<Envio | null> {
  const db = supabaseAdmin();
  const { data: aberto } = await db
    .from('tutoria_envios')
    .select('id')
    .eq('mentorada_id', normalizarId(mentoradaId))
    .eq('material_id', materialId)
    .is('enviado_em', null)
    .maybeSingle();
  if (!aberto) return null;

  const respostas = await respostasDoEnvio(aberto.id);
  if (!Object.values(respostas).some(temConteudo)) return null;

  const { data, error } = await db
    .from('tutoria_envios')
    .update({ enviado_em: new Date().toISOString() })
    .eq('id', aberto.id)
    .select('id, criado_em, atualizado_em, enviado_em')
    .single();
  if (error) throw new Error(error.message);
  return paraEnvio(data);
}
