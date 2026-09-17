import { exigirVisitante } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { Cabecalho } from '@/components/Cabecalho';
import { MenuMentoradas } from '@/components/MenuMentoradas';
import { RolarParaAncora } from '@/components/area-mentorada/RolarParaAncora';

/**
 * Área das mentoradas.
 *
 * Só aparece quem já está no modelo novo da área de membros.
 *
 * Entram o administrativo, que vê todas, e a própria mentorada, que vê só a
 * página dela.
 */
export default async function MentoradasLayout({ children }: { children: React.ReactNode }) {
  const visitante = await exigirVisitante();
  const todas = await mentoradasDoModeloNovo().catch(() => []);
  // A mentorada só enxerga a própria página; o administrativo, todas.
  const mentoradas = visitante.admin ? todas : todas.filter((m) => m.id === visitante.mentoradaId);

  return (
    <div className="min-h-dvh">
      <Cabecalho visitante={visitante} area="mentoradas" />

      <div className="mx-auto flex w-full max-w-[110rem] gap-10 px-4 py-8 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-8 h-[calc(100dvh-6rem)]">
            <MenuMentoradas
              base="/mentoradas"
              inicio={
                visitante.admin
                  ? { href: '/mentoradas', rotulo: 'Visão geral' }
                  : { href: `/mentoradas/${visitante.mentoradaId}`, rotulo: 'Minha área' }
              }
              secoes={[
                { rotulo: 'Progresso da mentoria', ancora: 'progresso' },
                {
                  rotulo: 'Área da mentorada',
                  ancora: 'area',
                  filhos: [
                    { rotulo: 'Sessões', rota: 'sessoes' },
                    { rotulo: 'Tutorias', rota: 'tutorias' },
                    { rotulo: 'Gestão de resultados', rota: 'gestao-de-resultados' },
                  ],
                },
                { rotulo: 'Planejamento estratégico', ancora: 'planejamento' },
                { rotulo: 'Tarefas da mentoria', ancora: 'tarefas' },
                { rotulo: 'Dashboard Bem-Sucedida', ancora: 'dashboard' },
              ]}
              mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
        <RolarParaAncora />
      </div>
    </div>
  );
}
