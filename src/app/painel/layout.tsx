import Link from 'next/link';
import { exigirSessao } from '@/lib/session';
import { BarraVerComo } from '@/components/BarraVerComo';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  return (
    <div className="min-h-dvh">
      {sessao.verComo ? <BarraVerComo nome={sessao.tutora.nome} /> : null}

      <header className="border-b border-borda bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/painel" className="group">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-texto-suave">
              La Fortuna Academy
            </p>
            <p className="text-sm font-semibold tracking-tight group-hover:text-marca">
              Área das tutoras
            </p>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link href="/painel/briefings" className="text-texto-suave transition hover:text-marca">
              Briefings
            </Link>
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

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
