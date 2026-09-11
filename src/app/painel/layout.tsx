import Link from 'next/link';
import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import { BarraVerComo } from '@/components/BarraVerComo';
import { MenuMentoradas } from '@/components/MenuMentoradas';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  // `carteiraDaTutora` é cacheada por requisição, então o menu e a página que
  // ele envolve dividem a mesma ida ao Notion.
  const mentoradas = await carteiraDaTutora(sessao.tutora.notion_tutora_page_id).catch(() => []);

  return (
    <div className="min-h-dvh">
      {sessao.verComo ? <BarraVerComo nome={sessao.tutora.nome} /> : null}

      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-6 py-4">
          <Link href="/painel/inicio" className="group">
            <p className="rotulo text-[10px] text-texto-suave">
              La Fortuna Academy
            </p>
            <p className="display text-base group-hover:text-marca">
              Área das tutoras
            </p>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-texto-suave sm:inline">{sessao.tutora.nome}</span>
            {sessao.real.is_admin ? (
              <Link href="/admin" className="text-texto-suave transition hover:text-marca">
                Admin
              </Link>
            ) : null}
            <form action="/logout" method="post">
              <button type="submit" className="text-texto-suave transition hover:text-marca">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[110rem] gap-10 px-6 py-8">
        {/* Abaixo de lg o menu sai: em tela estreita ele comeria a página toda,
            e a tabela do painel já lista as mesmas mentoradas. */}
        <aside className="hidden w-60 shrink-0 lg:block">
          {/* Altura fixa, não máxima: sem ela o `h-full` do menu não tem de
              quem herdar, a lista cresce e a rolagem nunca acontece. */}
          <div className="sticky top-8 h-[calc(100dvh-6rem)]">
            <MenuMentoradas mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome }))} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
