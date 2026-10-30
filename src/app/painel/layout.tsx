import { exigirSessao } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { BarraVerComo } from '@/components/BarraVerComo';
import { BarraDeAreas, type ItemDaBarra } from '@/components/BarraDeAreas';
import { FaixaDaMarca } from '@/components/FaixaDaMarca';
import { Cabecalho } from '@/components/Cabecalho';
import { MenuMentoradas } from '@/components/MenuMentoradas';
import { RolarParaAncora } from '@/components/area-mentorada/RolarParaAncora';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  // `mentoradasDoModeloNovo` é cacheada por requisição, então o menu e a página que
  // ele envolve dividem a mesma ida ao Notion.
  const mentoradas = await mentoradasDoModeloNovo().catch(() => []);

  // A barra das áreas é de quem administra, e some durante o "ver como": ali a
  // tela tem de ficar igualzinha à da tutora, com o menu dela e mais nada.
  // A barra marrom é de todo mundo aqui; muda só o que ela mostra. Durante o
  // "ver como" ela some: a tela tem de ficar igual à da tutora de verdade.
  const comBarra = !sessao.verComo;
  const secoes: ItemDaBarra[] = [
    { href: '/painel/inicio', base: '/painel/inicio', rotulo: 'Início', icone: 'inicio' },
    { href: '/painel/mentoradas', base: '/painel/mentoradas', rotulo: 'Mentoradas', icone: 'mentoradas' },
  ];

  return (
    <div className="flex min-h-dvh">
      {comBarra ? (
        <BarraDeAreas
          nome={sessao.real.nome}
          fotoId={sessao.real.notion_tutora_page_id}
          comAreas={sessao.real.is_admin}
          secoes={secoes}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        {sessao.verComo ? <BarraVerComo nome={sessao.tutora.nome} /> : null}

        {/* Com a barra à esquerda o cabeçalho vira repetição; ele volta só
            onde a barra não cabe. */}
        <div className={comBarra ? 'lg:hidden' : ''}>
          <Cabecalho sessao={sessao} area="tutoras" />
        </div>

        {/* A faixa da marca no alto: é o que dá o ar da La Fortuna a uma tela
            que, fora isso, é só trabalho. */}
        {comBarra ? <FaixaDaMarca /> : null}

        <div className="mx-auto flex w-full max-w-[110rem] gap-10 px-6 py-8">
          {/* Abaixo de lg o menu sai: em tela estreita ele comeria a página toda,
              e a tabela do painel já lista as mesmas mentoradas. */}
          <aside className="hidden w-60 shrink-0 lg:block">
            {/* Altura fixa, não máxima: sem ela o `h-full` do menu não tem de
                quem herdar, a lista cresce e a rolagem nunca acontece. */}
            <div className="sticky top-8 h-[calc(100dvh-6rem)]">
              <MenuMentoradas
                semTopo
                base="/painel"
                inicio={{ href: '/painel/inicio', rotulo: 'Início' }}
                secoes={[
                  { rotulo: 'Mapa da cliente', ancora: 'mapa' },
                  { rotulo: 'Planejamento estratégico', ancora: 'planejamento' },
                  { rotulo: 'Briefings', ancora: 'briefings' },
                  { rotulo: 'Hands-off', ancora: 'hands-off' },
                  { rotulo: 'Tutorias', ancora: 'tutorias' },
                ]}
                mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
          <RolarParaAncora />
        </div>
      </div>
    </div>
  );
}
