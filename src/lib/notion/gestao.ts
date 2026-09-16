import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getBlockChildren, getPage, queryDatabase, updatePage, NotionError, type NotionBlock, type NotionPage } from './client';
import { normalizarId } from './carteira';
import {
  AREA_DE_MEMBROS,
  GESTAO_ANO,
  GESTAO_CALLOUTS,
  GESTAO_MARCOS,
  GESTAO_MESES,
  GESTAO_TRIMESTRES,
  type SecaoGestao,
} from './config';
import { data, numero, texto, titulo } from './props';

/**
 * Gestão de resultados de uma mentorada, do modelo novo da área de membros.
 *
 * Diferente das bases compartilhadas (briefings, planejamento), aqui cada
 * mentorada tem a PRÓPRIA cópia das bases. O isolamento não depende de filtro:
 * o app desce pela árvore da página dela, então só chega às bases dela.
 *
 * Descer a árvore custa uma dúzia de chamadas. Os IDs encontrados ficam em
 * `notion_resolved_ids` (só os IDs — nenhum valor sai do Notion); o conteúdo é
 * sempre lido na hora.
 */

export type MesFinanceiro = {
  id: string;
  rotulo: string;
  /** 1 a 12, tirado do título ("04. Abril/26"). */
  ordem: number;
  ano: string;
  categoria: string;
  faturamento: number | null;
  resgate: number | null;
  despesas: number | null;
  investimento: number | null;
  lucroSemInvestimento: number | null;
  lucroComInvestimento: number | null;
  caixa: number | null;
  /** Fração: 0,25 = 25%. */
  percentualLucro: number | null;
};

export type TrimestreFinanceiro = {
  id: string;
  rotulo: string;
  numero: number;
  ano: string;
  faturamento: number | null;
  despesas: number | null;
  lucro: number | null;
  percentualLucro: number | null;
};

export type AnoFinanceiro = {
  id: string;
  ano: string;
  faturamento: number | null;
  despesas: number | null;
  investimentos: number | null;
  lucro: number | null;
  percentualLucro: number | null;
};

export type Marco = { id: string; titulo: string; data: string | null };

export type GestaoDeResultados = {
  anos: AnoFinanceiro[];
  meses: MesFinanceiro[];
  trimestres: TrimestreFinanceiro[];
  marcos: Marco[];
};

type Bases = Record<SecaoGestao, string>;

const SECOES = Object.keys(GESTAO_CALLOUTS) as SecaoGestao[];

/**
 * `null` quando a mentorada ainda não está no modelo novo — o que, até janeiro
 * de 2027, é o caso de quase todas.
 */
export const gestaoDeResultados = cache(
  async (mentoradaId: string): Promise<GestaoDeResultados | null> => {
    let bases = await basesDaMentorada(mentoradaId);
    if (!bases) return null;

    let paginas: Record<SecaoGestao, NotionPage[]>;
    try {
      paginas = await lerBases(bases);
    } catch (erro) {
      const sumiu = erro instanceof NotionError && (erro.status === 404 || erro.code === 'object_not_found');
      if (!sumiu) throw erro;

      // Uma base foi apagada ou recriada no Notion e o ID salvo não vale mais.
      await esquecerBases(mentoradaId);
      bases = await descobrirBases(mentoradaId);
      if (!bases) return null;
      await salvarBases(mentoradaId, bases);
      paginas = await lerBases(bases);
    }

    return {
      anos: paginas.ano.map(paraAno).sort((a, b) => a.ano.localeCompare(b.ano)),
      meses: paginas.meses
        .map(paraMes)
        .sort((a, b) => a.ano.localeCompare(b.ano) || a.ordem - b.ordem),
      trimestres: paginas.trimestres
        .map(paraTrimestre)
        .sort((a, b) => a.ano.localeCompare(b.ano) || a.numero - b.numero),
      marcos: paginas.marcos
        .map((p) => ({
          id: p.id,
          titulo: texto(p, GESTAO_MARCOS.titulo) || titulo(p),
          data: data(p, GESTAO_MARCOS.data),
        }))
        .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '')),
    };
  },
);

/** Os números que a pessoa digita; os de lucro são fórmula no Notion e só se leem. */
export const CAMPOS_EDITAVEIS_DO_MES = ['faturamento', 'resgate', 'despesas', 'investimento', 'caixa'] as const;
export type CampoEditavelDoMes = (typeof CAMPOS_EDITAVEIS_DO_MES)[number];

/**
 * Grava um número num mês. O ID do mês veio do navegador: só escreve se a
 * página morar na base de meses DESTA mentorada.
 */
export async function atualizarValorDoMes(
  mentoradaId: string,
  mesId: string,
  campo: CampoEditavelDoMes,
  valor: number | null,
): Promise<boolean> {
  const bases = await basesDaMentorada(mentoradaId);
  if (!bases) return false;

  const pagina = await getPage(mesId).catch(() => null);
  const dona = pagina?.parent?.database_id;
  if (!dona || normalizarId(dona) !== normalizarId(bases.meses)) return false;

  await updatePage(mesId, { [GESTAO_MESES[campo]]: { number: valor } });
  return true;
}

async function lerBases(bases: Bases): Promise<Record<SecaoGestao, NotionPage[]>> {
  const lidas = await Promise.all(
    SECOES.map(async (s) => [s, await queryDatabase(bases[s], { limite: 500 })] as const),
  );
  return Object.fromEntries(lidas) as Record<SecaoGestao, NotionPage[]>;
}

// --- IDs das bases -----------------------------------------------------------

const chave = (mentoradaId: string, secao: SecaoGestao) => `gestao:${mentoradaId}:${secao}`;

const basesDaMentorada = cache(async (mentoradaId: string): Promise<Bases | null> => {
  const { data: salvas } = await supabaseAdmin()
    .from('notion_resolved_ids')
    .select('section_key, notion_id')
    .in('section_key', SECOES.map((s) => chave(mentoradaId, s)));

  if (salvas && salvas.length === SECOES.length) {
    return Object.fromEntries(
      salvas.map((l) => [l.section_key.split(':').at(-1), l.notion_id]),
    ) as Bases;
  }

  const bases = await descobrirBases(mentoradaId);
  // A ausência não fica salva: a mentorada pode passar para o modelo novo a
  // qualquer momento, e a próxima visita tem de enxergar.
  if (bases) await salvarBases(mentoradaId, bases);
  return bases;
});

async function salvarBases(mentoradaId: string, bases: Bases): Promise<void> {
  const agora = new Date().toISOString();
  await supabaseAdmin()
    .from('notion_resolved_ids')
    .upsert(SECOES.map((s) => ({ section_key: chave(mentoradaId, s), notion_id: bases[s], resolved_at: agora })));
}

async function esquecerBases(mentoradaId: string): Promise<void> {
  await supabaseAdmin().from('notion_resolved_ids').delete().like('section_key', `gestao:${mentoradaId}:%`);
}

/**
 * A página "La Fortuna Academy & …" da área de membros, pendurada na página da
 * mentorada. Ponto de partida de tudo que é do modelo novo.
 */
export async function paginaDaAreaDeMembros(mentoradaId: string): Promise<string | null> {
  const membros = await acharFilho(mentoradaId, (b) => ehCallout(b, AREA_DE_MEMBROS.callout));
  if (!membros) return null;

  // Pelo tipo, não pelo título: a página acompanha o nome da mentorada e muda
  // quando alguém renomeia ("La Fortuna Academy & Nome", "Teste"…).
  const pagina = await acharFilho(membros.id, (b) => b.type === 'child_page');
  return pagina?.id ?? null;
}

async function descobrirBases(mentoradaId: string): Promise<Bases | null> {
  const pagina = await paginaDaAreaDeMembros(mentoradaId);
  if (!pagina) return null;

  const calloutCartoes = await acharFilho(pagina, (b) => ehCallout(b, AREA_DE_MEMBROS.calloutCartoes));
  if (!calloutCartoes) return null;

  const baseCartoes = await acharFilho(calloutCartoes.id, (b) => b.type === 'child_database');
  if (!baseCartoes) return null;

  const cartoes = await queryDatabase(baseCartoes.id, { limite: 50 });
  const gestao = cartoes.find((c) => mesmoTexto(titulo(c), AREA_DE_MEMBROS.cartaoGestao));
  if (!gestao) return null;

  const blocos = await getBlockChildren(gestao.id);
  const pares = await Promise.all(
    SECOES.map(async (s) => {
      const callout = blocos.find((b) => ehCallout(b, GESTAO_CALLOUTS[s]));
      const base = callout ? await acharFilho(callout.id, (b) => b.type === 'child_database') : null;
      return [s, base?.id ?? null] as const;
    }),
  );

  // Uma seção faltando é modelo alterado à mão: melhor não mostrar nada do que
  // mostrar a página pela metade.
  if (pares.some(([, id]) => !id)) return null;
  return Object.fromEntries(pares) as Bases;
}

/**
 * Primeiro bloco que satisfaz `aceita`, descendo por callouts, colunas e
 * toggles — nunca para dentro de outra página ou base.
 */
export async function acharFilho(
  raizId: string,
  aceita: (b: NotionBlock) => boolean,
  profundidade = 2,
): Promise<NotionBlock | null> {
  let nivel = [raizId];
  for (let p = 0; p <= profundidade && nivel.length > 0; p++) {
    const proximo: string[] = [];
    for (const id of nivel) {
      for (const b of await getBlockChildren(id)) {
        if (aceita(b)) return b;
        if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') proximo.push(b.id);
      }
    }
    nivel = proximo;
  }
  return null;
}

function textoDoBloco(b: NotionBlock): string {
  const conteudo = b[b.type] as { title?: string; rich_text?: { plain_text?: string }[] } | undefined;
  if (b.type === 'child_page' || b.type === 'child_database') return (conteudo?.title ?? '').trim();
  return (conteudo?.rich_text ?? []).map((t) => t.plain_text ?? '').join('').trim();
}

const mesmoTexto = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const ehCallout = (b: NotionBlock, nome: string) => b.type === 'callout' && mesmoTexto(textoDoBloco(b), nome);

// --- Linhas -> dados ----------------------------------------------------------

/** "26" -> "2026". */
const anoCheio = (a: string) => (a.length === 2 ? `20${a}` : a);

function paraMes(p: NotionPage): MesFinanceiro {
  const rotulo = texto(p, GESTAO_MESES.mes) || titulo(p);
  const m = rotulo.match(/^(\d{1,2})\s*\.\s*[^/]+\/\s*(\d{2,4})/);
  return {
    id: p.id,
    rotulo,
    ordem: m ? Number(m[1]) : 99,
    ano: m ? anoCheio(m[2]) : '',
    categoria: texto(p, GESTAO_MESES.categoria),
    faturamento: numero(p, GESTAO_MESES.faturamento),
    resgate: numero(p, GESTAO_MESES.resgate),
    despesas: numero(p, GESTAO_MESES.despesas),
    investimento: numero(p, GESTAO_MESES.investimento),
    lucroSemInvestimento: numero(p, GESTAO_MESES.lucroSemInvestimento),
    lucroComInvestimento: numero(p, GESTAO_MESES.lucroComInvestimento),
    caixa: numero(p, GESTAO_MESES.caixa),
    percentualLucro: numero(p, GESTAO_MESES.percentualLucro),
  };
}

function paraTrimestre(p: NotionPage): TrimestreFinanceiro {
  const rotulo = texto(p, GESTAO_TRIMESTRES.trimestre) || titulo(p);
  const m = rotulo.match(/(\d)\s*\/\s*(\d{2,4})/);
  return {
    id: p.id,
    rotulo,
    numero: m ? Number(m[1]) : 9,
    ano: m ? anoCheio(m[2]) : '',
    faturamento: numero(p, GESTAO_TRIMESTRES.faturamento),
    despesas: numero(p, GESTAO_TRIMESTRES.despesas),
    lucro: numero(p, GESTAO_TRIMESTRES.lucro),
    percentualLucro: numero(p, GESTAO_TRIMESTRES.percentualLucro),
  };
}

function paraAno(p: NotionPage): AnoFinanceiro {
  return {
    id: p.id,
    ano: texto(p, GESTAO_ANO.ano) || titulo(p),
    faturamento: numero(p, GESTAO_ANO.faturamento),
    despesas: numero(p, GESTAO_ANO.despesas),
    investimentos: numero(p, GESTAO_ANO.investimentos),
    lucro: numero(p, GESTAO_ANO.lucro),
    percentualLucro: numero(p, GESTAO_ANO.percentualLucro),
  };
}
