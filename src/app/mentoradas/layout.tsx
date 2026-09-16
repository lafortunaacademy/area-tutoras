import { exigirAdmin } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { Cabecalho } from '@/components/Cabecalho';
import { MenuMentoradas } from '@/components/MenuMentoradas';

/**
 * Área das mentoradas.
 *
 * Só aparece quem já está no modelo novo da área de membros.
 *
 * Por enquanto só o administrativo entra — as mentoradas ainda não têm login.
 * Quando tiverem, esta porta passa a aceitar a própria mentorada, e cada uma só
 * a própria página.
 */
export default async function MentoradasLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirAdmin();
  const mentoradas = await mentoradasDoModeloNovo().catch(() => []);

  return (
    <div className="min-h-dvh">
      <Cabecalho sessao={sessao} area="mentoradas" />

      <div className="mx-auto flex w-full max-w-[110rem] gap-10 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-8 h-[calc(100dvh-6rem)]">
            <MenuMentoradas
              base="/mentoradas"
              inicio={{ href: '/mentoradas', rotulo: 'Visão geral' }}
              mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
