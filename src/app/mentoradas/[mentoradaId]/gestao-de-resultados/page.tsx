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
import { anoSelecionado, anosDisponiveis } from '@/components/area-mentorada/financeiro';
import { SeletorDeAno } from '@/components/area-mentorada/SeletorDeAno';

export const dynamic = 'force-dynamic';

/** Gestão de resultados de uma mentorada — a página do cartão de mesmo nome. */
export default async function GestaoDeResultadosPage({
  params,
  searchParams,
}: {
  params: Promise<{ mentoradaId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const sessao = await exigirAdmin();
  const { mentoradaId } = await params;
  const { ano: anoPedido } = await searchParams;
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
        <Conteudo gestao={gestao} mentoradaId={mentorada.id} anoPedido={anoPedido} />
      )}
    </div>
  );
}

function Conteudo({
  gestao,
  mentoradaId,
  anoPedido,
}: {
  gestao: GestaoDeResultados;
  mentoradaId: string;
  anoPedido?: string;
}) {
  const disponiveis = anosDisponiveis(gestao);
  const selecionado = anoSelecionado(gestao, anoPedido);
  const anos = [...gestao.anos].reverse();
  const link = (ano: string) => `/mentoradas/${mentoradaId}/gestao-de-resultados?ano=${ano}`;

  return (
    <>
      <Grupo titulo="Marcos & Conquistas">
        <Bloco icone={Flag} titulo="Linha do tempo">
          <LinhaDoTempo marcos={gestao.marcos} />
        </Bloco>
      </Grupo>

      <Grupo titulo="Resultados financeiros">
        <SeletorDeAno anos={disponiveis} selecionado={selecionado} caminho={`/mentoradas/${mentoradaId}/gestao-de-resultados`} />

        <Bloco icone={CalendarDays} titulo="Por ano">
          {anos.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhum ano cadastrado.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {anos.map((a) => (
                <li key={a.id}>
                  <Link
                    href={link(a.ano)}
                    scroll={false}
                    aria-current={a.ano === selecionado ? 'true' : undefined}
                    className={`block rounded-xl border px-4 py-3 transition hover:border-marca ${
                      a.ano === selecionado ? 'border-marca bg-fundo' : 'border-borda bg-fundo/60'
                    }`}
                  >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays aria-hidden size={14} className="text-marca" />
                    {a.ano}
                  </p>
                  <dl className="mt-2.5 space-y-1 text-xs">
                    {[
                      { rotulo: 'Faturamento', texto: reais(a.faturamento), valor: a.faturamento },
                      { rotulo: 'Despesas', texto: reais(a.despesas), valor: a.despesas },
                      { rotulo: 'Investimentos', texto: reais(a.investimentos), valor: a.investimentos },
                      { rotulo: 'Lucro (R$)', texto: reais(a.lucro), valor: a.lucro, forte: true },
                      { rotulo: 'Lucro (%)', texto: percentual(a.percentualLucro), valor: a.percentualLucro, forte: true },
                    ].map((l) => (
                      <div
                        key={l.rotulo}
                        className={`flex justify-between gap-3 ${l.rotulo === 'Lucro (R$)' ? 'mt-1.5 border-t border-borda/60 pt-1.5' : ''}`}
                      >
                        <dt className="text-texto-suave">{l.rotulo}</dt>
                        <dd
                          className={`tabular-nums ${l.forte ? 'font-medium' : ''} ${
                            l.forte && l.valor !== null && l.valor > 0 ? 'text-ok' : ''
                          }`}
                        >
                          {l.texto}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco icone={Wallet} titulo="Visão mensal financeira">
          <p className="mb-1.5 px-1 text-sm font-medium">{selecionado}</p>
          <VisaoMensal key={selecionado} mentoradaId={mentoradaId} grupos={gruposDoAno(gestao.meses, selecionado)} />
        </Bloco>

        <Bloco icone={CalendarRange} titulo="Visão financeira trimestral">
          <p className="mb-1.5 px-1 text-sm font-medium">{selecionado}</p>
          <TabelaTrimestres trimestres={gestao.trimestres.filter((t) => t.ano === selecionado)} />
        </Bloco>
      </Grupo>
    </>
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
