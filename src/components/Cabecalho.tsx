import Image from 'next/image';
import Link from 'next/link';
import type { Sessao } from '@/lib/session';

export type Area = 'admin' | 'tutoras' | 'mentoradas';

const AREAS: { chave: Area; rotulo: string; nome: string; href: string }[] = [
  { chave: 'admin', rotulo: 'Administrativo', nome: 'Administrativo', href: '/admin' },
  { chave: 'tutoras', rotulo: 'Tutoras', nome: 'Área das tutoras', href: '/painel/inicio' },
  { chave: 'mentoradas', rotulo: 'Mentoradas', nome: 'Área das mentoradas', href: '/mentoradas' },
];

/**
 * Cabeçalho comum às três áreas.
 *
 * A troca de área só aparece para admin: uma tutora nunca vê o link para a área
 * das mentoradas, e as páginas de lá ainda conferem o admin no servidor — o
 * link escondido é conforto, não proteção.
 */
export function Cabecalho({ sessao, area }: { sessao: Sessao; area: Area }) {
  const atual = AREAS.find((a) => a.chave === area)!;
  // Na área das tutoras, durante um "ver como", o nome é o de quem está sendo vista.
  const nome = area === 'tutoras' ? sessao.tutora.nome : sessao.real.nome;

  return (
    <header className="border-b border-borda bg-superficie">
      <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={atual.href} className="flex shrink-0 items-center gap-3">
          {/* A logo é preta sobre transparente; no escuro ela some, então
              inverte junto com o tema. */}
          <Image
            src="/marca/la-fortuna.png"
            alt="La Fortuna Academy"
            width={2369}
            height={862}
            priority
            className="logo-marca h-7 w-auto sm:h-8"
          />
          <span className="hidden border-l border-borda pl-3 text-sm text-texto-suave md:inline">
            {atual.nome}
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
          {sessao.real.is_admin ? (
            <nav aria-label="Áreas" className="flex items-center gap-0.5 rounded-lg border border-borda p-0.5">
              {AREAS.map((a) => (
                <Link
                  key={a.chave}
                  href={a.href}
                  aria-current={a.chave === area ? 'page' : undefined}
                  className={`rounded-md px-2 py-1 text-[11px] whitespace-nowrap transition sm:px-2.5 sm:text-xs ${
                    a.chave === area
                      ? 'bg-marca font-medium text-marca-contraste'
                      : 'text-texto-suave hover:text-texto'
                  }`}
                >
                  {/* No celular o cabeçalho não comporta os três nomes inteiros. */}
                  <span className="sm:hidden">{a.chave === 'admin' ? 'Admin' : a.rotulo}</span>
                  <span className="hidden sm:inline">{a.rotulo}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          <span className="hidden truncate text-texto-suave lg:inline">{nome}</span>
          <form action="/logout" method="post">
            <button type="submit" className="text-texto-suave transition hover:text-marca">
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
