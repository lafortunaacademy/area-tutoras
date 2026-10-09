import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryDatabase, updatePage, type NotionPage } from './client';
import { resolverDatabaseId } from './resolver';
import { MAPA } from './config';
import { carteiraDaTutora, normalizarId } from './carteira';
import { cadastrosDasClientes } from './clientes';
import { texto, titulo } from './props';

/**
 * As respostas do formulário "Mapa da cliente".
 *
 * A mentorada responde o formulário do Notion e a resposta cai na base "Mapas
 * das clientes" sem saber de quem é: o formulário tem nome e e-mail, mas não a
 * relation `Mentorada`, que é o que liga a resposta à área dela. Aqui o app faz
 * essa ponte sozinho — pelo e-mail do acesso ao app e, se não achar, pelo nome.
 *
 * O que não dá para decidir fica pendente, para o administrativo ligar à mão:
 * ligar na mentorada errada mostraria o mapa de uma pessoa na área de outra.
 */

export type RespostaDoMapa = {
  id: string;
  nome: string;
  email: string;
  criadaEm: string;
};

export type Ligacao = { resposta: RespostaDoMapa; mentoradaId: string; nome: string; por: 'e-mail' | 'nome' };

export type ResultadoDaPonte = {
  ligadas: Ligacao[];
  pendentes: RespostaDoMapa[];
};

/** Liga todas as respostas soltas e devolve o que ligou e o que sobrou. */
export async function ligarRespostasDoMapa(): Promise<ResultadoDaPonte> {
  const soltas = await respostasSoltas();
  if (soltas.length === 0) return { ligadas: [], pendentes: [] };

  const [porEmail, mentoradas] = await Promise.all([emailsDasClientes(), carteiraDaTutora()]);
  const porNome = new Map(mentoradas.map((m) => [semAcento(m.nome), m]));

  const ligadas: Ligacao[] = [];
  const pendentes: RespostaDoMapa[] = [];

  for (const resposta of soltas) {
    const peloEmail = resposta.email ? porEmail.get(resposta.email.trim().toLowerCase()) : undefined;
    const peloNome = resposta.nome ? porNome.get(semAcento(resposta.nome)) : undefined;
    const alvo = peloEmail ?? peloNome;

    if (!alvo) {
      pendentes.push(resposta);
      continue;
    }

    await updatePage(resposta.id, { [MAPA.mentorada]: { relation: [{ id: alvo.id }] } });
    ligadas.push({ resposta, mentoradaId: alvo.id, nome: alvo.nome, por: peloEmail ? 'e-mail' : 'nome' });
  }

  return { ligadas, pendentes };
}

/** Liga uma resposta a uma mentorada escolhida à mão, no administrativo. */
export async function ligarRespostaNaMentorada(respostaId: string, mentoradaId: string): Promise<boolean> {
  const [dbId, mentoradas] = await Promise.all([resolverDatabaseId('mapas'), carteiraDaTutora()]);
  const alvo = mentoradas.find((m) => m.id === normalizarId(mentoradaId));
  if (!alvo) return false;

  // O ID vem do navegador: a resposta precisa ser desta base.
  const linhas = await queryDatabase(dbId, { limite: 500 });
  if (!linhas.some((p) => normalizarId(p.id) === normalizarId(respostaId))) return false;

  await updatePage(respostaId, { [MAPA.mentorada]: { relation: [{ id: alvo.id }] } });
  return true;
}

/** As respostas que ainda não apontam para nenhuma mentorada. */
export async function respostasSoltas(): Promise<RespostaDoMapa[]> {
  const dbId = await resolverDatabaseId('mapas');
  const linhas = await queryDatabase(dbId, {
    filter: { property: MAPA.mentorada, relation: { is_empty: true } },
    limite: 200,
  });

  return linhas.map(paraResposta).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm));
}

function paraResposta(p: NotionPage): RespostaDoMapa {
  return {
    id: p.id,
    nome: texto(p, MAPA.titulo) || titulo(p),
    email: texto(p, 'E-mail'),
    criadaEm: p.created_time ?? '',
  };
}

/**
 * e-mail -> página da cliente. Vem de dois lugares: o cadastro no Notion ("CRM
 * clientes", que é onde o e-mail nasce) e o acesso ao app, para quem entrou com
 * um e-mail diferente do cadastrado.
 */
async function emailsDasClientes(): Promise<Map<string, { id: string; nome: string }>> {
  const [cadastros, { data: acessos }] = await Promise.all([
    cadastrosDasClientes().catch(() => []),
    supabaseAdmin().from('mentoradas_acesso').select('email, nome, notion_page_id').eq('ativa', true),
  ]);

  const mapa = new Map<string, { id: string; nome: string }>();
  for (const c of cadastros) {
    if (c.email && c.areaId) mapa.set(c.email, { id: c.areaId, nome: c.nome });
  }
  for (const a of acessos ?? []) {
    mapa.set(String(a.email).trim().toLowerCase(), {
      id: normalizarId(String(a.notion_page_id)),
      nome: String(a.nome ?? ''),
    });
  }
  return mapa;
}

const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
