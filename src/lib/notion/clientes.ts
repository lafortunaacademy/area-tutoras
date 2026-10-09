import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { queryDatabase } from './client';
import { resolverDatabaseId } from './resolver';
import { CRM } from './config';
import { normalizarId } from './carteira';
import { relationIds, texto, titulo } from './props';

/**
 * O cadastro das clientes, na base "CRM clientes" do Notion.
 *
 * É lá que o e-mail da cliente é preenchido quando ela entra, e é de lá que sai
 * o vínculo com a área de membros dela. Com os dois, o app libera o acesso
 * sozinho: ninguém precisa recadastrar e-mail no administrativo.
 */

export type Cadastro = {
  id: string;
  nome: string;
  email: string;
  /** Página da área de membros dela; vazio quando o cadastro ainda não foi ligado. */
  areaId: string | null;
};

export async function cadastrosDasClientes(): Promise<Cadastro[]> {
  const dbId = await resolverDatabaseId('crm');
  const linhas = await queryDatabase(dbId, { limite: 500 });

  return linhas.map((p) => ({
    id: p.id,
    nome: texto(p, CRM.nome) || titulo(p),
    email: texto(p, CRM.email).trim().toLowerCase(),
    areaId: relationIds(p, CRM.areaDeMembros).map(normalizarId)[0] ?? null,
  }));
}

export type AcessoLiberado = { email: string; nome: string; mentoradaId: string };

export type ResultadoDosAcessos = {
  /** Acessos criados agora. */
  liberados: AcessoLiberado[];
  /** Quem trocou de e-mail no cadastro: o antigo deixou de valer. */
  trocados: { de: string; para: string; nome: string }[];
  /** Acessos tirados porque o cadastro não tem mais e-mail (ou a cliente saiu). */
  removidos: string[];
  /** Cadastro com e-mail, mas sem área de membros ligada: o app não sabe de quem é. */
  semArea: Cadastro[];
};

/**
 * Deixa os acessos do app iguais ao cadastro do Notion.
 *
 * O e-mail do cadastro é a fonte: criar lá cria aqui, trocar lá troca aqui
 * (o antigo para de valer) e apagar lá tira o acesso. Só mexe nos acessos que
 * vieram do cadastro — os liberados à mão no Administrativo ficam como estão.
 */
export async function liberarAcessosDoCadastro(): Promise<ResultadoDosAcessos> {
  const cadastros = await cadastrosDasClientes();
  const doCadastro = cadastros.filter((c) => c.email && c.areaId);

  const db = supabaseAdmin();
  const { data: atuais } = await db
    .from('mentoradas_acesso')
    .select('id, email, notion_page_id, origem')
    .eq('origem', 'cadastro');

  const existentes = (atuais ?? []).map((a) => ({
    id: String(a.id),
    email: String(a.email).trim().toLowerCase(),
    mentoradaId: normalizarId(String(a.notion_page_id)),
  }));

  const liberados: AcessoLiberado[] = [];
  const trocados: { de: string; para: string; nome: string }[] = [];

  for (const c of doCadastro) {
    const daMentorada = existentes.find((a) => a.mentoradaId === c.areaId);

    if (!daMentorada) {
      // Pode já existir um acesso manual com esse mesmo e-mail: aí não há o que fazer.
      const { data: mesmoEmail } = await db.from('mentoradas_acesso').select('id').eq('email', c.email).maybeSingle();
      if (mesmoEmail) continue;

      await db
        .from('mentoradas_acesso')
        .insert({ email: c.email, nome: c.nome, notion_page_id: c.areaId, ativa: true, origem: 'cadastro' });
      liberados.push({ email: c.email, nome: c.nome, mentoradaId: c.areaId! });
      continue;
    }

    if (daMentorada.email !== c.email) {
      await db.from('mentoradas_acesso').update({ email: c.email, nome: c.nome }).eq('id', daMentorada.id);
      trocados.push({ de: daMentorada.email, para: c.email, nome: c.nome });
    }
  }

  // Cadastro sem e-mail (ou cliente que saiu da base): o acesso dela sai junto.
  const vivos = new Set(doCadastro.map((c) => `${c.areaId}|${c.email}`));
  const sobrando = existentes.filter((a) => !vivos.has(`${a.mentoradaId}|${a.email}`));
  const removidos: string[] = [];
  for (const a of sobrando) {
    const trocou = trocados.some((t) => t.de === a.email);
    if (trocou) continue;
    await db.from('mentoradas_acesso').delete().eq('id', a.id);
    removidos.push(a.email);
  }

  return {
    liberados,
    trocados,
    removidos,
    semArea: cadastros.filter((c) => c.email && !c.areaId),
  };
}
