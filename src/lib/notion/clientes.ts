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
  liberados: AcessoLiberado[];
  /** Cadastro com e-mail, mas sem área de membros ligada: o app não sabe de quem é. */
  semArea: Cadastro[];
};

/**
 * Libera no app o acesso de toda cliente que já tem e-mail e área de membros no
 * cadastro. É idempotente: rodar de novo não duplica nem reescreve quem já está lá.
 */
export async function liberarAcessosDoCadastro(): Promise<ResultadoDosAcessos> {
  const cadastros = await cadastrosDasClientes();
  const comEmail = cadastros.filter((c) => c.email);

  const db = supabaseAdmin();
  const { data: existentes } = await db.from('mentoradas_acesso').select('email');
  const jaTem = new Set((existentes ?? []).map((a) => String(a.email).trim().toLowerCase()));

  const novos = comEmail.filter((c) => c.areaId && !jaTem.has(c.email));
  if (novos.length) {
    await db.from('mentoradas_acesso').insert(
      novos.map((c) => ({ email: c.email, nome: c.nome, notion_page_id: c.areaId, ativa: true })),
    );
  }

  return {
    liberados: novos.map((c) => ({ email: c.email, nome: c.nome, mentoradaId: c.areaId! })),
    semArea: comEmail.filter((c) => !c.areaId),
  };
}
