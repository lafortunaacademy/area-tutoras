import { exigirSessao } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { BarraVerComo } from '@/components/BarraVerComo';
import { BarraDeAreas, type ItemDaBarra } from '@/components/BarraDeAreas';
import { FaixaDaMarca } from '@/components/FaixaDaMarca';
import { Cabecalho } from '@/components/Cabecalho';
import { RolarParaAncora } from '@/components/area-mentorada/RolarParaAncora';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  // `mentoradasDoModeloNovo` é cacheada por requisição, então a barra e a
  // página que ela envolve dividem a mesma ida ao Notion.
  const mentoradas = await mentoradasDoModeloNovo().catch(() => []);

  // A barra marrom é de todo mundo aqui; muda só o que ela mostra. No "ver
  // como" ela fica, mas sem o bloco das áreas: é assim que a tutora vê.
  const areasNaBarra = sessao.real.is_admin && !sessao.verComo;
  const secoes: ItemDaBarra[] = [
    { href: '/painel/inicio', base: '/painel/inicio', rotulo: 'Início', icone: 'inicio' },
    { href: '/painel/mentoradas', base: '/painel/mentoradas', rotulo: 'Mentoradas', icone: 'mentoradas', comLista: true },
  ];

  return (
    <div className="flex min-h-dvh">
      <BarraDeAreas
        nome={sessao.tutora.nome}
        fotoId={sessao.tutora.notion_tutora_page_id}
        foto={sessao.tutora.foto}
        comAreas={areasNaBarra}
        secoes={secoes}
        mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
        base="/painel"
      />

      <div className="min-w-0 flex-1">
        {sessao.verComo ? <BarraVerComo nome={sessao.tutora.nome} /> : null}

        {/* Com a barra à esquerda o cabeçalho vira repetição; ele volta só
            onde a barra não cabe. */}
        <div className="lg:hidden">
          <Cabecalho sessao={sessao} area="tutoras" />
        </div>

        {/* A faixa da marca no alto: é o que dá o ar da La Fortuna a uma tela
            que, fora isso, é só trabalho. */}
        <FaixaDaMarca />

        <div className="mx-auto flex w-full max-w-6xl px-6 py-8">
          <main className="min-w-0 flex-1">{children}</main>
          <RolarParaAncora />
        </div>
      </div>
    </div>
  );
}
