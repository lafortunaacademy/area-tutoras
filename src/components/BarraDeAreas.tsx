'use client';

import { useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { rolarAte } from '@/lib/ancora';
import type { SecaoMenu } from '@/components/MenuMentoradas';
import { GraduationCap, Home, Search, Settings, Sparkles, Users } from 'lucide-react';
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
const AREAS: ItemDaBarra[] = [
  { href: '/admin', base: '/admin', rotulo: 'Área inicial', icone: 'configuracoes' },
  { href: '/painel/inicio', base: '/painel', rotulo: 'Área de tutoras', icone: 'tutoras' },
  { href: '/mentoradas', base: '/mentoradas', rotulo: 'Área das mentoradas', icone: 'membros' },
];

/**
 * O ícone vai por nome, não por componente: o que atravessa do servidor para
 * cá tem de ser dado simples, e função não é.
 */
const ICONES = {
  configuracoes: Settings,
  tutoras: GraduationCap,
  membros: Sparkles,
  inicio: Home,
  mentoradas: Users,
} as const;

export type ItemDaBarra = {
  href: string;
  base: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  /** Pendura a busca e a lista de mentoradas embaixo deste item. */
  comLista?: boolean;
  /** Só a lista, sem um item por cima: quando o rótulo repetiria o da área. */
  semRotulo?: boolean;
};

export function BarraDeAreas({
  nome,
  fotoId,
  foto,
  comAreas = true,
  tambemTutora = false,
  secoes = [],
  mentoradas = [],
  base = '/painel',
  secoesDaMentorada = [],
}: {
  nome: string;
  fotoId?: string | null;
  /** Retrato enviado à mão, de quem não tem página na base Tutoras. */
  foto?: string | null;
  /** Administra e também dá tutoria: pode alternar entre o time e o recorte dela. */
  tambemTutora?: boolean;
  /** As três áreas do sistema. Só quem administra anda entre elas. */
  comAreas?: boolean;
  /** O que a área atual tem dentro (Início, Mentoradas…), abaixo das áreas. */
  secoes?: ItemDaBarra[];
  /** A lista de mentoradas, com busca, quando a área tem uma. */
  mentoradas?: { id: string; nome: string; foto: string | null }[];
  /** Onde mora a página de cada mentorada ("/painel", "/mentoradas"). */
  base?: string;
  /** As partes da página da mentorada aberta, penduradas embaixo do nome dela. */
  secoesDaMentorada?: SecaoMenu[];
}) {
  const caminho = usePathname();
  const busca2 = useSearchParams();
  const [busca, setBusca] = useState('');

  // Quem administra e dá tutoria vê as duas leituras da área: o time e a dela.
  const noRecorteDela = busca2.get('como') === 'tutora';

  // São 44 nomes: sem filtro, achar alguém vira rolagem e paciência.
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mentoradas;
    return mentoradas.filter((m) => m.nome.toLowerCase().includes(termo));
  }, [busca, mentoradas]);

  /** As partes da página de uma mentorada, recuadas embaixo do nome dela. */
  const partes = (raiz: string) => {
    if (secoesDaMentorada.length === 0) return null;

    return (
      <ul className="my-1 ml-4 space-y-px border-l border-marca-contraste/15 pl-2">
        {secoesDaMentorada.map((sec) => {
          const destino = `${raiz}${sec.rota ? `/${sec.rota}` : ''}${sec.ancora ? `#${sec.ancora}` : ''}`;
          const naRota = sec.rota ? caminho.startsWith(`${raiz}/${sec.rota}`) : false;
          return (
            <li key={sec.rotulo}>
              <Link
                href={destino}
                // Seção da própria página: rola até ela em vez de navegar.
                onClick={(e) => {
                  if (!sec.rota && sec.ancora && caminho === raiz && rolarAte(sec.ancora)) e.preventDefault();
                }}
                aria-current={naRota ? 'page' : undefined}
                className={`block rounded-lg px-2.5 py-1 text-[12px] leading-snug transition ${
                  naRota ? 'bg-marca-contraste/15 font-medium' : 'opacity-60 hover:bg-marca-contraste/10 hover:opacity-100'
                }`}
              >
                {sec.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  const lista = (
    <div className="mt-1 ml-4 flex flex-col border-l border-marca-contraste/15 pl-2">
      <label className="relative mb-2 block">
        <Search aria-hidden size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-60" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar mentorada"
          aria-label="Buscar mentorada"
          className="w-full rounded-lg border border-marca-contraste/20 bg-marca-contraste/10 py-1.5 pr-3 pl-8 text-[13px] text-marca-contraste outline-none placeholder:text-marca-contraste/50 focus:border-marca-contraste/50"
        />
      </label>

      <ul className="max-h-[45vh] space-y-0.5 overflow-y-auto pr-1">
        {visiveis.map((m) => {
          const aqui = caminho.startsWith(`${base}/${m.id}`);
          return (
            <li key={m.id}>
              <Link
                href={`${base}/${m.id}`}
                aria-current={aqui ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-snug transition ${
                  aqui ? 'bg-marca-contraste/15 font-medium' : 'opacity-70 hover:bg-marca-contraste/10 hover:opacity-100'
                }`}
              >
                <Retrato nome={m.nome} foto={m.foto} />
                <span className="min-w-0 flex-1 truncate">{m.nome}</span>
              </Link>

              {aqui ? partes(`${base}/${m.id}`) : null}
            </li>
          );
        })}

        {visiveis.length === 0 ? <li className="px-3 py-2 text-[12px] opacity-60">Ninguém com esse nome.</li> : null}
      </ul>
    </div>
  );

  const item = (a: ItemDaBarra, ehArea = false) => {
    const aqui = caminho === a.base || caminho.startsWith(`${a.base}/`);
    const Icone = ICONES[a.icone];
    // Quem tem lista mostra a busca; quem não tem (a própria mentorada) mostra
    // direto as partes da área dela.
    if (a.semRotulo) return <div key={a.base}>{lista}</div>;

    const comLista = a.comLista && mentoradas.length > 0;
    const soPartes = a.comLista && mentoradas.length === 0;

    const link = (
      <Link
        key={a.base}
        href={a.href}
        aria-current={aqui ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition ${
          aqui ? 'bg-marca-contraste/15 font-medium' : 'opacity-70 hover:bg-marca-contraste/10 hover:opacity-100'
        }`}
      >
        <Icone aria-hidden size={16} strokeWidth={1.8} className="shrink-0" />
        <span className="min-w-0 truncate text-[14px] leading-snug">{a.rotulo}</span>
      </Link>
    );

    // O que a área tem dentro mora dentro dela, recuado, e só na área aberta:
    // um bloco "Nesta área" à parte repetia o que a lista de cima já diz.
    if (ehArea && aqui && (secoes.length > 0 || (a.base === '/painel' && tambemTutora))) {
      return (
        <div key={a.base} className="flex flex-col">
          {link}
          <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-marca-contraste/15 pl-2">
            {a.base === '/painel' && tambemTutora ? (
              <Link
                href={noRecorteDela ? '/painel/inicio' : '/painel/inicio?como=tutora'}
                className="block rounded-lg px-2.5 py-1 text-[12px] leading-snug opacity-60 transition hover:bg-marca-contraste/10 hover:opacity-100"
              >
                {noRecorteDela ? 'Ver o time' : 'Ver como tutora'}
              </Link>
            ) : null}
            {secoes.map((sec) => item(sec, false))}
          </div>
        </div>
      );
    }

    if (soPartes) {
      return (
        <div key={a.base} className="flex flex-col">
          {link}
          {partes(a.base)}
        </div>
      );
    }

    if (!comLista) return link;

    // A busca e a lista moram embaixo de "Mentoradas", recuadas: são o que há
    // dentro dele, não outro item do menu.
    return (
      <div key={a.base} className="flex flex-col">
        {link}
        {lista}
      </div>
    );
  };

  return (
    <nav
      aria-label="Áreas do sistema"
      className="hidden w-56 shrink-0 bg-marca text-marca-contraste lg:block"
    >
      <div className="sticky top-0 flex h-dvh flex-col gap-1 overflow-y-auto p-3">
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

        {comAreas ? (
          <>
            <p className="px-3 pb-2 text-[11px] tracking-[0.18em] uppercase opacity-60">Áreas</p>
            {AREAS.map((a) => item(a, true))}
          </>
        ) : null}

        {!comAreas && secoes.length > 0 ? (
          <div className="flex flex-col gap-1">{secoes.map((sec) => item(sec))}</div>
        ) : null}
        {/* Quem está logada, o tema e a saída: tudo o que era do cabeçalho
            mora aqui, no pé da barra. */}
        <div className="mt-auto border-t border-marca-contraste/15 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 text-[14px]">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- já sai reduzida do servidor
              <img src={foto} alt="" className="size-5 shrink-0 rounded-full object-cover object-top" />
            ) : fotoId ? (
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

/** Foto pequena ao lado do nome; sem foto, as iniciais seguram o alinhamento. */
function Retrato({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className="size-5 shrink-0 rounded-full object-cover" />;
  }

  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marca-contraste/20 text-[9px] font-medium"
    >
      {iniciais(nome)}
    </span>
  );
}
