import { MapPinned, Users } from 'lucide-react';
import { exigirAdmin, type Tutora } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Cabecalho } from '@/components/Cabecalho';
import { tutorasDoHub } from '@/lib/notion/hub';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { respostasSoltas } from '@/lib/notion/mapas';
import { normalizarId } from '@/lib/notion/carteira';
import { ListaDeAcessos, NovoAcesso, type Pessoa } from './Acessos';
import { RespostasDoMapa } from './RespostasDoMapa';

export const dynamic = 'force-dynamic';

/**
 * As configurações do app — que é tudo o que o administrativo precisa ser.
 *
 * As duas áreas agora estão no cabeçalho, então a página abre direto no que só
 * existe aqui: quem entra, as respostas de mapa que ficaram sem dona e como o
 * app está ligado ao resto.
 */
export default async function AdminPage() {
  const sessao = await exigirAdmin();

  const [{ data: tutoras }, { data: clientes }, doHub, mentoradas, semDono] = await Promise.all([
    supabaseAdmin().from('tutoras').select('*').order('nome').returns<Tutora[]>(),
    supabaseAdmin()
      .from('mentoradas_acesso')
      .select('id, nome, email, ativa, notion_page_id')
      .order('nome')
      .returns<{ id: string; nome: string; email: string; ativa: boolean; notion_page_id: string }[]>(),
    tutorasDoHub().catch(() => []),
    mentoradasDoModeloNovo().catch(() => []),
    respostasSoltas().catch(() => []),
  ]);

  const doTime: Pessoa[] = (tutoras ?? []).map((t) => ({
    id: t.id,
    nome: t.nome,
    email: t.email,
    ativa: t.ativa,
    admin: t.is_admin,
    fotoId: t.notion_tutora_page_id,
    foto: t.foto,
    euMesma: t.id === sessao.real.id,
  }));
  // Quem foi apagada do Notion continua no cadastro daqui: a página some, o
  // acesso fica. Marcar isso é o que evita mandar o "ver como" para um 404.
  const noNotion = new Set(mentoradas.map((m) => normalizarId(m.id)));
  const daCasa: Pessoa[] = (clientes ?? []).map((c) => ({
    ...c,
    mentoradaId: c.notion_page_id,
    semPagina: mentoradas.length > 0 && !noNotion.has(normalizarId(c.notion_page_id)),
  }));

  return (
    <div className="min-h-dvh">
      <div className="lg:hidden">
        <Cabecalho sessao={sessao} area="admin" />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="display text-3xl italic">Olá, {sessao.real.nome.split(' ')[0]}.</h1>

        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
            <Users aria-hidden size={18} className="text-marca" />
            Acessos
          </h2>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-borda px-5 py-3">
                <h3 className="text-sm font-medium">Time interno</h3>
                <p className="text-xs text-texto-suave">
                  {doTime.filter((p) => p.ativa).length} com acesso · {doTime.length} no total
                </p>
              </div>
              <ListaDeAcessos tabela="tutoras" pessoas={doTime} comVerComo removivel />
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

        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <MapPinned aria-hidden size={18} className="text-marca" />
            Mapas sem dona
          </h2>
          <p className="mt-1 mb-4 max-w-2xl text-sm text-texto-suave">
            Respostas do formulário do Mapa da cliente que o app não conseguiu ligar a ninguém, porque o
            e-mail não está no cadastro e o nome não bateu. Escolha a mentorada e a resposta vai para a área dela.
          </p>

          <RespostasDoMapa pendentes={semDono} mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome }))} />
        </section>

      </div>
    </div>
  );
}
