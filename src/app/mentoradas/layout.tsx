import { exigirVisitante } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { BarraDeAreas, type ItemDaBarra } from '@/components/BarraDeAreas';
import { BarraVerComo } from '@/components/BarraVerComo';
import { FaixaDaMarca } from '@/components/FaixaDaMarca';
import { Cabecalho } from '@/components/Cabecalho';
import type { SecaoMenu } from '@/components/MenuMentoradas';
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
      {/* A barra é de todo mundo; só o bloco das áreas é de quem administra. */}
      <BarraDeAreas
        nome={visitante.nome}
        comAreas={visitante.admin}
        secoes={
          visitante.admin
            ? ([
                { href: '/mentoradas', base: '/mentoradas', rotulo: 'Visão geral', icone: 'inicio' },
                {
                  href: `/mentoradas/${mentoradas[0]?.id ?? ''}`,
                  base: '/mentoradas/',
                  rotulo: 'Mentoradas',
                  icone: 'mentoradas',
                  comLista: true,
                },
              ] as ItemDaBarra[])
            : ([
                {
                  href: `/mentoradas/${visitante.mentoradaId}`,
                  base: `/mentoradas/${visitante.mentoradaId}`,
                  rotulo: 'Minha área',
                  icone: 'membros',
                  comLista: true,
                },
              ] as ItemDaBarra[])
        }
        mentoradas={visitante.admin ? mentoradas.map((m) => ({ id: m.id, nome: m.nome, foto: m.foto })) : []}
        base="/mentoradas"
        secoesDaMentorada={SECOES}
      />

      <div className="min-w-0 flex-1">
        {visitante.verComo ? <BarraVerComo nome={visitante.nome} /> : null}

        {/* Com a barra à esquerda o cabeçalho vira repetição; ele volta só
            onde a barra não cabe. */}
        <div className="lg:hidden">
          <Cabecalho visitante={visitante} area="mentoradas" />
        </div>

        <FaixaDaMarca />

        <div className="mx-auto flex w-full max-w-6xl px-4 py-8 sm:px-6">
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
