import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import { BarraVerComo } from '@/components/BarraVerComo';
import { Cabecalho } from '@/components/Cabecalho';
import { MenuMentoradas } from '@/components/MenuMentoradas';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirSessao();

  // `carteiraDaTutora` é cacheada por requisição, então o menu e a página que
  // ele envolve dividem a mesma ida ao Notion.
  const mentoradas = await carteiraDaTutora().catch(() => []);

  return (
    <div className="min-h-dvh">
      {sessao.verComo ? <BarraVerComo nome={sessao.tutora.nome} /> : null}

      <Cabecalho sessao={sessao} area="tutoras" />

      <div className="mx-auto flex w-full max-w-[110rem] gap-10 px-6 py-8">
        {/* Abaixo de lg o menu sai: em tela estreita ele comeria a página toda,
            e a tabela do painel já lista as mesmas mentoradas. */}
        <aside className="hidden w-60 shrink-0 lg:block">
          {/* Altura fixa, não máxima: sem ela o `h-full` do menu não tem de
              quem herdar, a lista cresce e a rolagem nunca acontece. */}
          <div className="sticky top-8 h-[calc(100dvh-6rem)]">
            <MenuMentoradas
              base="/painel"
              inicio={{ href: '/painel/inicio', rotulo: 'Início' }}
              mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
