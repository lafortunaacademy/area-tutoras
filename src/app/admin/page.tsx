import Link from 'next/link';
import { ArrowRight, Eye, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react';
import { exigirAdmin, type Tutora } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Cabecalho } from '@/components/Cabecalho';
import { verComo } from './actions';
import { AcessoMentorada } from './AcessoMentorada';
import { RespostasDoMapa } from './RespostasDoMapa';
import { respostasSoltas } from '@/lib/notion/mapas';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { normalizarId } from '@/lib/notion/carteira';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sessao = await exigirAdmin();

  const [{ data: tutoras }, { data: acessos }, mentoradas, semDono] = await Promise.all([
    supabaseAdmin().from('tutoras').select('*').order('nome').returns<Tutora[]>(),
    supabaseAdmin().from('mentoradas_acesso').select('id, email, notion_page_id').order('email'),
    mentoradasDoModeloNovo().catch(() => []),
    respostasSoltas().catch(() => []),
  ]);

  return (
    <div className="min-h-dvh">
      <Cabecalho sessao={sessao} area="admin" />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="display text-3xl">Administrativo</h1>
        <p className="mt-1 text-sm text-texto-suave">
          As duas áreas da La Fortuna Academy, em um só lugar.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <CartaoArea
            href="/painel/inicio"
            icone={GraduationCap}
            titulo="Área das tutoras"
            texto="Mentoradas, mapa da cliente, planejamento, briefings e hands-off — como as tutoras veem."
          />
          <CartaoArea
            href="/mentoradas"
            icone={Sparkles}
            titulo="Área das mentoradas"
            texto="A área de membros de cada mentorada: progresso, planejamento, tarefas e resultados."
          />
        </div>

        <section className="mt-14">
          <h2 className="rotulo text-[11px] text-texto-suave">Acesso das mentoradas</h2>
          <p className="mt-1 mb-4 text-sm text-texto-suave">
            O e-mail com que cada mentorada entra no app e nos formulários. Pode ser qualquer e-mail dela.
          </p>

          {mentoradas.length ? (
            <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
              {mentoradas.map((m) => (
                <AcessoMentorada
                  key={m.id}
                  mentoradaId={m.id}
                  nome={m.nome}
                  emails={(acessos ?? []).filter((a) => normalizarId(a.notion_page_id) === m.id).map((a) => ({ id: a.id, email: a.email }))}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
              Nenhuma mentorada no modelo novo ainda.
            </p>
          )}
        </section>

        <section className="mt-14">
          <h2 className="rotulo text-[11px] text-texto-suave">Mapas sem dona</h2>
          <p className="mt-1 mb-4 text-sm text-texto-suave">
            Respostas do formulário do Mapa da cliente que o app não conseguiu ligar a ninguém — porque o
            e-mail não está no cadastro e o nome não bateu. Escolha a mentorada e a resposta vai para a área dela.
          </p>

          <RespostasDoMapa
            pendentes={semDono}
            mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome }))}
          />
        </section>

        <section className="mt-14">
          <h2 className="rotulo text-[11px] text-texto-suave">Ver como uma tutora</h2>
          <p className="mt-1 mb-4 text-sm text-texto-suave">
            Veja a área exatamente como cada tutora vê, sem logar como ela.
          </p>

          <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
            {(tutoras ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {t.nome}
                    {t.is_admin ? (
                      <span className="ml-2 rounded-full bg-marca-suave px-2 py-0.5 text-[11px] font-normal text-marca">
                        admin
                      </span>
                    ) : null}
                    {!t.ativa ? (
                      <span className="ml-2 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-normal text-texto-suave">
                        inativa
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-texto-suave">{t.email}</p>
                </div>

                {t.id === sessao.real.id ? (
                  <span className="shrink-0 text-xs text-texto-suave">você</span>
                ) : (
                  <form action={verComo}>
                    <input type="hidden" name="tutoraId" value={t.id} />
                    <button
                      type="submit"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-medium transition hover:border-marca hover:text-marca"
                    >
                      <Eye aria-hidden size={14} />
                      Ver como
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function CartaoArea({
  href,
  icone: Icone,
  titulo,
  texto,
}: {
  href: string;
  icone: LucideIcon;
  titulo: string;
  texto: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-borda bg-superficie p-6 transition hover:border-marca hover:shadow-[var(--sombra)]"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-marca-suave text-marca">
        <Icone aria-hidden size={18} />
      </span>
      <span className="display mt-5 text-2xl">{titulo}</span>
      <span className="mt-1.5 flex-1 text-sm text-texto-suave">{texto}</span>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-marca">
        Entrar
        <ArrowRight aria-hidden size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
