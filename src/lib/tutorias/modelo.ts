import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * O modelo das tutorias, que agora mora no próprio app: pilares > tutorias >
 * materiais (que podem ter materiais dentro) > perguntas. É o mesmo para todas
 * as mentoradas; o que muda de uma para outra são as respostas.
 */

export type TipoMaterial = 'formulario' | 'conteudo' | 'grupo' | 'especial';
export type TipoPergunta = 'texto' | 'opcoes' | 'arquivo' | 'aviso';

export type Material = {
  id: string;
  nome: string;
  icone: string | null;
  tipo: TipoMaterial;
  filhos: Material[];
  /** Perguntas que pedem resposta (sem contar os avisos). */
  totalPerguntas: number;
};

export type Tutoria = { id: string; nome: string; icone: string | null; materiais: Material[] };

export type Pilar = {
  id: string;
  nome: string;
  icone: string | null;
  frase: { texto: string; negrito: boolean }[];
  tutorias: Tutoria[];
};

export type Pergunta = {
  id: string;
  materialId: string;
  secao: string | null;
  texto: string;
  ajuda: string | null;
  tipo: TipoPergunta;
  opcoes: string[];
};

type Linha<T> = T & { ordem: number };

export const modeloDasTutorias = cache(async (): Promise<Pilar[]> => {
  const db = supabaseAdmin();
  const [pilares, tutorias, materiais, perguntas] = await Promise.all([
    db.from('tutoria_pilares').select('id, nome, icone, frase, ordem').order('ordem'),
    db.from('tutoria_tutorias').select('id, pilar_id, nome, icone, ordem').order('ordem'),
    db.from('tutoria_materiais').select('id, tutoria_id, pai_id, nome, icone, tipo, ordem').order('ordem'),
    db.from('tutoria_perguntas').select('material_id, tipo'),
  ]);
  for (const r of [pilares, tutorias, materiais, perguntas]) if (r.error) throw new Error(r.error.message);

  const contagem = new Map<string, number>();
  for (const p of perguntas.data ?? []) {
    if (p.tipo !== 'aviso') contagem.set(p.material_id, (contagem.get(p.material_id) ?? 0) + 1);
  }

  type LinhaMaterial = Linha<{ id: string; tutoria_id: string; pai_id: string | null; nome: string; icone: string | null; tipo: TipoMaterial }>;
  const todos = (materiais.data ?? []) as LinhaMaterial[];
  const montar = (m: LinhaMaterial): Material => ({
    id: m.id,
    nome: m.nome,
    icone: m.icone,
    tipo: m.tipo,
    totalPerguntas: contagem.get(m.id) ?? 0,
    filhos: todos.filter((f) => f.pai_id === m.id).map(montar),
  });

  return (pilares.data ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    icone: p.icone,
    frase: (p.frase ?? []) as Pilar['frase'],
    tutorias: (tutorias.data ?? [])
      .filter((t) => t.pilar_id === p.id)
      .map((t) => ({
        id: t.id,
        nome: t.nome,
        icone: t.icone,
        materiais: todos.filter((m) => m.tutoria_id === t.id && !m.pai_id).map(montar),
      })),
  }));
});

/** O material e as perguntas dele, na ordem. `null` se não existir. */
export async function formulario(materialId: string): Promise<{ id: string; nome: string; tipo: TipoMaterial; perguntas: Pergunta[] } | null> {
  const db = supabaseAdmin();
  const [material, perguntas] = await Promise.all([
    db.from('tutoria_materiais').select('id, nome, tipo').eq('id', materialId).maybeSingle(),
    db.from('tutoria_perguntas').select('id, material_id, secao, texto, ajuda, tipo, opcoes').eq('material_id', materialId).order('ordem'),
  ]);
  if (material.error) throw new Error(material.error.message);
  if (perguntas.error) throw new Error(perguntas.error.message);
  if (!material.data) return null;

  return {
    ...material.data,
    tipo: material.data.tipo as TipoMaterial,
    perguntas: (perguntas.data ?? []).map((p) => ({
      id: p.id,
      materialId: p.material_id,
      secao: p.secao,
      texto: p.texto,
      ajuda: p.ajuda,
      tipo: p.tipo as TipoPergunta,
      opcoes: (p.opcoes ?? []) as string[],
    })),
  };
}

/** Uma pergunta, com o material dela — para conferir o que chega do navegador. */
export async function pergunta(perguntaId: string): Promise<Pergunta | null> {
  const { data, error } = await supabaseAdmin()
    .from('tutoria_perguntas')
    .select('id, material_id, secao, texto, ajuda, tipo, opcoes')
    .eq('id', perguntaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    materialId: data.material_id,
    secao: data.secao,
    texto: data.texto,
    ajuda: data.ajuda,
    tipo: data.tipo as TipoPergunta,
    opcoes: (data.opcoes ?? []) as string[],
  };
}
