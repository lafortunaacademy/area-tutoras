'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Settings, Sparkles } from 'lucide-react';
import { BotaoTema } from '@/components/BotaoTema';
import { FotoDaTutora } from '@/components/area-mentorada/FotoDaTutora';
import { iniciais } from '@/lib/iniciais';

/**
 * As três áreas do sistema, numa barra marrom à esquerda.
 *
 * Só quem administra vê: tutora e mentorada têm uma área só, e para elas a
 * barra seria uma parede sem porta. Abaixo de `lg` ela sai — a tela não
 * comporta duas colunas de menu —, e aí quem troca de área é o seletor do
 * cabeçalho.
 */
const AREAS = [
  { href: '/admin', base: '/admin', rotulo: 'Área inicial', detalhe: 'Configurações', icone: Settings },
  { href: '/painel/inicio', base: '/painel', rotulo: 'Área de tutoras', detalhe: 'Como as tutoras veem', icone: GraduationCap },
  { href: '/mentoradas', base: '/mentoradas', rotulo: 'Área das mentoradas', detalhe: 'A área de membros', icone: Sparkles },
];

export function BarraDeAreas({ nome, fotoId }: { nome: string; fotoId?: string | null }) {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Áreas do sistema"
      className="hidden w-56 shrink-0 bg-marca text-marca-contraste lg:block"
    >
      <div className="sticky top-0 flex h-dvh flex-col gap-1 p-3">
        <Link href="/admin" className="px-3 py-5">
          {/* O logotipo é preto sobre transparente: na barra marrom ele inverte
              (vira claro) e, no tema escuro, volta ao normal — lá a barra é bege. */}
          <Image
            src="/marca/la-fortuna.png"
            alt="La Fortuna Academy"
            width={2369}
            height={862}
            priority
            className="logo-na-barra h-11 w-auto"
          />
        </Link>

        <p className="px-3 pb-2 text-[11px] tracking-[0.18em] uppercase opacity-60">Áreas</p>

        {AREAS.map((a) => {
          const aqui = caminho === a.base || caminho.startsWith(`${a.base}/`);
          const Icone = a.icone;

          return (
            <Link
              key={a.base}
              href={a.href}
              aria-current={aqui ? 'page' : undefined}
              className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition ${
                aqui ? 'bg-marca-contraste/15 font-medium' : 'opacity-70 hover:bg-marca-contraste/10 hover:opacity-100'
              }`}
            >
              <Icone aria-hidden size={16} strokeWidth={1.8} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[14px] leading-snug">{a.rotulo}</span>
                <span className="mt-0.5 block text-[12px] leading-snug opacity-60">{a.detalhe}</span>
              </span>
            </Link>
          );
        })}
        {/* Quem está logada, o tema e a saída: tudo o que era do cabeçalho
            mora aqui, no pé da barra. */}
        <div className="mt-auto border-t border-marca-contraste/15 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 text-[14px]">
            {fotoId ? (
              <FotoDaTutora id={fotoId} nome={nome} />
            ) : (
              <span
                aria-hidden
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marca-contraste/20 text-[10px] font-medium"
              >
                {iniciais(nome)}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{nome}</span>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2">
            <BotaoTema />
            <form action="/logout" method="post">
              <button type="submit" className="text-xs opacity-70 transition hover:opacity-100">
                Sair
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
