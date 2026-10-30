import { exigirVisitante } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { BarraDeAreas } from '@/components/BarraDeAreas';
import { Cabecalho } from '@/components/Cabecalho';
import { MenuMentoradas, type SecaoMenu } from '@/components/MenuMentoradas';
import { RolarParaAncora } from '@/components/area-mentorada/RolarParaAncora';
import { AtalhosNoCelular } from '@/components/area-mentorada/AtalhosNoCelular';

/**
 * Área das mentoradas.
 *
 * Só aparece quem já está no modelo novo da área de membros.
 *
 * Entram o administrativo, que vê todas, e a própria mentorada, que vê só a
 * página dela.
 */
/** As partes da área da mentorada: no menu lateral e, no celular, na faixa de atalhos. */
const SECOES: SecaoMenu[] = [
  { rotulo: 'Progresso da mentoria', ancora: 'progresso' },
  { rotulo: 'Sessões e tutorias', ancora: 'sessoes' },
  { rotulo: 'Resultados financeiros', rota: 'gestao-de-resultados' },
  { rotulo: 'Planejamento estratégico', ancora: 'planejamento' },
  { rotulo: 'Tarefas da mentoria', ancora: 'tarefas' },
  { rotulo: 'Dashboard Bem-Sucedida', ancora: 'dashboard' },
];

export default async function MentoradasLayout({ children }: { children: React.ReactNode }) {
  const visitante = await exigirVisitante();
  const todas = await mentoradasDoModeloNovo().catch(() => []);
  // A mentorada só enxerga a própria página; o administrativo, todas.
  const mentoradas = visitante.admin ? todas : todas.filter((m) => m.id === visitante.mentoradaId);

  return (
    <div className="flex min-h-dvh">
      {/* A mentorada tem uma área só: a barra das áreas é de quem administra. */}
      {visitante.admin ? <BarraDeAreas nome={visitante.nome} /> : null}

      <div className="min-w-0 flex-1">
        {/* Com a barra à esquerda o cabeçalho vira repetição; ele volta só
            onde a barra não cabe. */}
        <div className={visitante.admin ? 'lg:hidden' : ''}>
          <Cabecalho visitante={visitante} area="mentoradas" />
        </div>

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
                secoes={SECOES}
                mentoradas={mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto }))}
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <AtalhosNoCelular base="/mentoradas" secoes={SECOES} />
            {children}
          </main>
          <RolarParaAncora />
        </div>
      </div>
    </div>
  );
}
