import Image from 'next/image';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import type { Sessao, Visitante } from '@/lib/session';
import { BotaoTema } from '@/components/BotaoTema';

export type Area = 'admin' | 'tutoras' | 'mentoradas';

const AREAS: { chave: Area; rotulo: string; nome: string; href: string }[] = [
  { chave: 'admin', rotulo: 'Administrativo', nome: 'Administrativo', href: '/admin' },
  { chave: 'tutoras', rotulo: 'Área de tutorias', nome: 'Área das tutoras', href: '/painel/inicio' },
  { chave: 'mentoradas', rotulo: 'Área das mentoradas', nome: 'Área das mentoradas', href: '/mentoradas' },
];

/**
 * Cabeçalho comum às três áreas.
 *
 * A troca de área só aparece para admin: uma tutora nunca vê o link para a área
 * das mentoradas, e as páginas de lá ainda conferem o admin no servidor — o
 * link escondido é conforto, não proteção.
 */
export function Cabecalho({
  sessao,
  visitante,
  area,
}: {
  sessao?: Sessao;
  /** Quem entrou na área das mentoradas, quando não é uma tutora. */
  visitante?: Visitante;
  area: Area;
}) {
  const atual = AREAS.find((a) => a.chave === area)!;
  // Na área das tutoras, durante um "ver como", o nome é o de quem está sendo vista.
  const nome = sessao ? (area === 'tutoras' ? sessao.tutora.nome : sessao.real.nome) : (visitante?.nome ?? '');
  const admin = sessao ? sessao.real.is_admin : Boolean(visitante?.admin);

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
          {/* O administrativo sai do seletor: ele é a casa de quem administra, e
              fica no nome, ao lado. Aqui ficam só as duas áreas. */}
          {admin ? (
            <nav aria-label="Áreas" className="flex items-center gap-0.5 rounded-lg border border-borda p-0.5">
              {AREAS.filter((a) => a.chave !== 'admin').map((a) => (
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
                  {/* No celular o cabeçalho não comporta os nomes inteiros. */}
                  <span className="sm:hidden">{a.chave === 'tutoras' ? 'Tutorias' : 'Mentoradas'}</span>
                  <span className="hidden sm:inline">{a.rotulo}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {/* Configurações: quem entra no app. Só para quem administra. */}
          {admin ? (
            <Link
              href="/admin/configuracoes"
              title="Configurações"
              className="rounded-lg p-1.5 text-texto-suave transition hover:bg-superficie-2 hover:text-marca"
            >
              <Settings aria-hidden size={16} />
              <span className="sr-only">Configurações</span>
            </Link>
          ) : null}

          <BotaoTema />
          {admin ? (
            <Link
              href="/admin"
              title="Administrativo"
              aria-current={area === 'admin' ? 'page' : undefined}
              className={`hidden truncate transition hover:text-marca lg:inline ${
                area === 'admin' ? 'font-medium text-texto' : 'text-texto-suave'
              }`}
            >
              {nome}
            </Link>
          ) : (
            <span className="hidden truncate text-texto-suave lg:inline">{nome}</span>
          )}
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
