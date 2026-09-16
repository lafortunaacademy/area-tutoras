import Link from 'next/link';
import { ArrowLeft, CalendarDays, CalendarRange, Flag, Wallet } from 'lucide-react';
import { exigirAdmin } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import {
  gestaoDeResultados,
  type GestaoDeResultados,
  type MesFinanceiro,
  type TrimestreFinanceiro,
} from '@/lib/notion/gestao';
import { percentual, reais } from '@/lib/formato';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Bloco, Grupo } from '@/components/area-mentorada/Bloco';
import { LinhaDoTempo } from '@/components/area-mentorada/LinhaDoTempo';
import { TabelaFinanceira } from '@/components/area-mentorada/TabelaFinanceira';
import { VisaoMensal, type GrupoMensal } from '@/components/area-mentorada/VisaoMensal';
import { anoPrincipal, anosComMovimento } from '@/components/area-mentorada/financeiro';

export const dynamic = 'force-dynamic';

/** Gestão de resultados de uma mentorada — a página do cartão de mesmo nome. */
export default async function GestaoDeResultadosPage({
  params,
}: {
  params: Promise<{ mentoradaId: string }>;
}) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const gestao = await gestaoDeResultados(mentorada.id).catch((e) => e as Error);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/mentoradas/${mentorada.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
      >
        <ArrowLeft aria-hidden size={14} />
        {mentorada.nome}
      </Link>

      <h1 className="display text-3xl sm:text-4xl">Gestão de resultados</h1>
      <p className="mt-1 text-sm text-texto-suave">{mentorada.nome}</p>

      {gestao instanceof Error ? (
        <div className="mt-8">
          <AvisoNotion erro={gestao} detalhar={sessao.real.is_admin} />
        </div>
      ) : gestao === null ? (
        <p className="mt-8 rounded-xl border border-dashed border-borda px-4 py-8 text-center text-sm text-texto-suave">
          A área desta mentorada ainda está no modelo antigo. A gestão de resultados aparece aqui
          quando ela passar para o modelo novo.
        </p>
      ) : (
        <Conteudo gestao={gestao} mentoradaId={mentorada.id} />
      )}
    </div>
  );
}

function Conteudo({ gestao, mentoradaId }: { gestao: GestaoDeResultados; mentoradaId: string }) {
  const principal = anoPrincipal(gestao, String(new Date().getFullYear()));
  const outros = anosComMovimento(gestao).filter((a) => a !== principal);
  const anos = [...gestao.anos].reverse();

  return (
    <>
      <Grupo titulo="Marcos & Conquistas">
        <Bloco icone={Flag} titulo="Linha do tempo">
          <LinhaDoTempo marcos={gestao.marcos} />
        </Bloco>
      </Grupo>

      <Grupo titulo="Resultados financeiros">
        <Bloco icone={CalendarDays} titulo="Por ano">
          {anos.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum ano cadastrado.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {anos.map((a) => (
                <li key={a.id} className="rounded-xl border border-borda bg-fundo px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays aria-hidden size={14} className="text-marca" />
                    {a.ano}
                  </p>
                  <p className="display mt-2 text-2xl leading-none tabular-nums">{reais(a.lucro)}</p>
                  <p className="mt-0.5 text-[11px] text-texto-suave">
                    lucro · {percentual(a.percentualLucro)}
                  </p>
                  <dl className="mt-3 space-y-1 border-t border-borda pt-2 text-xs">
                    {[
                      ['Faturamento', a.faturamento],
                      ['Despesas', a.despesas],
                      ['Investimentos', a.investimentos],
                    ].map(([rotulo, valor]) => (
                      <div key={rotulo as string} className="flex justify-between gap-3">
                        <dt className="text-texto-suave">{rotulo}</dt>
                        <dd className="tabular-nums">{reais(valor as number | null)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco icone={Wallet} titulo="Visão mensal financeira">
          <PorAno
            principal={principal}
            outros={outros}
            conteudo={(ano) => <VisaoMensal mentoradaId={mentoradaId} grupos={gruposDoAno(gestao.meses, ano)} />}
          />
        </Bloco>

        <Bloco icone={CalendarRange} titulo="Visão financeira trimestral">
          <PorAno
            principal={principal}
            outros={outros}
            conteudo={(ano) => <TabelaTrimestres trimestres={gestao.trimestres.filter((t) => t.ano === ano)} />}
          />
        </Bloco>
      </Grupo>
    </>
  );
}

/** O ano principal aberto; os demais recolhidos embaixo. */
function PorAno({
  principal,
  outros,
  conteudo,
}: {
  principal: string;
  outros: string[];
  conteudo: (ano: string) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 px-1 text-sm font-medium">{principal}</p>
        {conteudo(principal)}
      </div>
      {outros.map((ano) => (
        <details key={ano} className="group rounded-xl border border-borda">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-texto-suave transition hover:text-texto">
            <span className="transition-transform group-open:rotate-90">›</span>
            <span className="font-medium">{ano}</span>
          </summary>
          <div className="border-t border-borda p-3">{conteudo(ano)}</div>
        </details>
      ))}
    </div>
  );
}

function TabelaTrimestres({ trimestres }: { trimestres: TrimestreFinanceiro[] }) {
  if (trimestres.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
        Nenhum trimestre cadastrado.
      </p>
    );
  }

  return (
    <TabelaFinanceira
      colunas={[
        { nome: 'Trimestre' },
        { nome: 'Faturamento', numero: true },
        { nome: 'Despesas', numero: true },
        { nome: 'Lucro (R$)', numero: true },
        { nome: 'Lucro (%)', numero: true },
      ]}
      linhas={trimestres.map((t) => ({
        id: t.id,
        celulas: [
          <span key="trimestre" className="font-medium">
            {t.rotulo}
          </span>,
          reais(t.faturamento),
          reais(t.despesas),
          reais(t.lucro),
          percentual(t.percentualLucro),
        ],
      }))}
    />
  );
}

/** Negócio antes de pessoal; o que não tiver categoria vai por último. */
const ORDEM_CATEGORIA = ['negócio', 'pessoal'];

function gruposDoAno(meses: MesFinanceiro[], ano: string): GrupoMensal[] {
  const doAno = meses.filter((m) => m.ano === ano);
  const categorias = [...new Set(doAno.map((m) => m.categoria))].sort((a, b) => {
    const pa = ORDEM_CATEGORIA.indexOf(a.toLowerCase());
    const pb = ORDEM_CATEGORIA.indexOf(b.toLowerCase());
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  return categorias.map((categoria) => ({
    categoria,
    linhas: doAno
      .filter((m) => m.categoria === categoria)
      .map((m) => ({
        id: m.id,
        mes: MESES_CURTOS[m.ordem - 1] ?? m.rotulo,
        mesCompleto: m.rotulo,
        editaveis: {
          faturamento: m.faturamento,
          resgate: m.resgate,
          despesas: m.despesas,
          investimento: m.investimento,
          caixa: m.caixa,
        },
        calculados: {
          lucroSem: m.lucroSemInvestimento,
          lucroCom: m.lucroComInvestimento,
          percentual: m.percentualLucro,
        },
      })),
  }));
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
