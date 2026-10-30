import Link from 'next/link';
import { ArrowLeft, KeyRound, Users } from 'lucide-react';
import { exigirAdmin, type Tutora } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Cabecalho } from '@/components/Cabecalho';
import { tutorasDoHub } from '@/lib/notion/hub';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { ListaDeAcessos, NovoAcesso, type Pessoa } from './Acessos';

export const dynamic = 'force-dynamic';

/**
 * Configurações do app: hoje, quem entra.
 *
 * Os dois grupos vêm de tabelas diferentes porque veem coisas diferentes: o
 * time interno entra pela base Tutoras do Notion, a cliente pela página dela
 * em Área clientes. O que é igual nos dois é o e-mail — é ele a chave do login.
 */
export default async function ConfiguracoesPage() {
  const sessao = await exigirAdmin();

  const [{ data: tutoras }, { data: clientes }, doHub, mentoradas] = await Promise.all([
    supabaseAdmin().from('tutoras').select('*').order('nome').returns<Tutora[]>(),
    supabaseAdmin()
      .from('mentoradas_acesso')
      .select('id, nome, email, ativa')
      .order('nome')
      .returns<{ id: string; nome: string; email: string; ativa: boolean }[]>(),
    tutorasDoHub().catch(() => []),
    mentoradasDoModeloNovo().catch(() => []),
  ]);

  const doTime: Pessoa[] = (tutoras ?? []).map((t) => ({
    id: t.id,
    nome: t.nome,
    email: t.email,
    ativa: t.ativa,
    marca: t.is_admin ? 'administradora' : undefined,
  }));
  const daCasa: Pessoa[] = clientes ?? [];

  return (
    <div className="min-h-dvh">
      <Cabecalho sessao={sessao} area="admin" />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/admin" className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca">
          <ArrowLeft aria-hidden size={14} />
          Administrativo
        </Link>

        <h1 className="display text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-texto-suave">Quem entra no app e como ele está ligado ao resto.</p>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <Users aria-hidden size={18} className="text-marca" />
            Acessos
          </h2>
          <p className="mt-1 mb-4 max-w-2xl text-sm text-texto-suave">
            Não existe senha: a pessoa entra pelo link que chega no e-mail cadastrado aqui. Desligar o
            interruptor tira o acesso na hora e guarda o cadastro para quando ela voltar.
          </p>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-borda px-5 py-3">
                <h3 className="text-sm font-medium">Time interno</h3>
                <p className="text-xs text-texto-suave">
                  {doTime.filter((p) => p.ativa).length} com acesso · {doTime.length} no total
                </p>
              </div>
              <ListaDeAcessos tabela="tutoras" pessoas={doTime} />
              <NovoAcesso tipo="tutora" pessoas={doHub.map((t) => ({ id: t.id, nome: t.nome }))} />
            </div>

            <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-borda px-5 py-3">
                <h3 className="text-sm font-medium">Clientes</h3>
                <p className="text-xs text-texto-suave">
                  {daCasa.filter((p) => p.ativa).length} com acesso · {daCasa.length} no total
                </p>
              </div>
              <ListaDeAcessos tabela="mentoradas_acesso" pessoas={daCasa} removivel />
              <NovoAcesso tipo="cliente" pessoas={mentoradas.map((m) => ({ id: m.id, nome: m.nome }))} />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <KeyRound aria-hidden size={18} className="text-marca" />
            Como o app está ligado
          </h2>

          <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-borda bg-borda sm:grid-cols-2">
            {[
              ['Endereço', 'tutorias.lafortunaacademy.com.br'],
              ['Conteúdo', 'Notion — nada é guardado em outro lugar'],
              ['Entrada', 'link por e-mail, sem senha'],
              ['Remetente', 'La Fortuna Academy · acesso@lafortunaacademy.com.br'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="bg-superficie px-5 py-3">
                <dt className="text-[11px] tracking-wide text-texto-suave uppercase">{rotulo}</dt>
                <dd className="mt-0.5 text-sm break-words">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
