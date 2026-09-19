'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Loader2, Plus, Send, X } from 'lucide-react';
import type { Pergunta, QuemPreenche } from '@/lib/tutorias/modelo';
import type { Envio, EstadoDoFormulario, Valor } from '@/lib/tutorias/respostas';
import { FormularioDoApp } from './FormularioDoApp';

type Dados = { material: { nome: string; perguntas: Pergunta[]; quemPreenche: QuemPreenche }; estado: EstadoDoFormulario; podeEditar: boolean };

/**
 * Busca já começada (ao passar o mouse no nome do material), para o toggle
 * abrir com o formulário pronto. Uma por material e mentorada; some ao enviar.
 */
const buscas = new Map<string, Promise<Dados>>();
export function prebuscarFormulario(materialId: string, mentoradaId: string): Promise<Dados> {
  const chave = `${mentoradaId}:${materialId}`;
  let busca = buscas.get(chave);
  if (!busca) {
    busca = fetch(`/api/tutorias/materiais/${materialId}?mentorada=${encodeURIComponent(mentoradaId)}`).then((r) =>
      r.ok ? (r.json() as Promise<Dados>) : Promise.reject(new Error('falhou')),
    );
    busca.catch(() => buscas.delete(chave));
    buscas.set(chave, busca);
  }
  return busca;
}

const quando = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

/**
 * Um formulário que pode ser respondido várias vezes (a pré-sessão de cada
 * sessão). A mentorada preenche e envia; cada envio vira uma caixinha com a
 * data, que é o que a equipe vê.
 */
export function PainelDoFormulario({
  materialId,
  mentoradaId,
  paraMentorada = false,
  mostrarEnviadas = true,
}: {
  materialId: string;
  mentoradaId: string;
  /** Quem preenche é a própria mentorada: sempre uma resposta nova, textos para ela. */
  paraMentorada?: boolean;
  /** As caixinhas das respostas já enviadas (no link do formulário ficam de fora). */
  mostrarEnviadas?: boolean;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [mexeu, setMexeu] = useState(false);
  // Acabou de enviar: a mentorada vê o agradecimento em vez de um formulário novo.
  const [obrigado, setObrigado] = useState(false);
  // Equipe: o formulário de uma tutoria nova abre numa tela por cima, pelo botão.
  const [registrando, setRegistrando] = useState(false);
  const [enviando, setEnviando] = useState<'parado' | 'enviando' | 'vazio' | 'erro'>('parado');

  const consulta = `mentorada=${encodeURIComponent(mentoradaId)}`;

  const buscar = useCallback(() => prebuscarFormulario(materialId, mentoradaId), [materialId, mentoradaId]);

  useEffect(() => {
    let vivo = true;
    buscar()
      .then((d) => vivo && setDados(d))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
    };
  }, [buscar]);

  const enviar = async () => {
    setEnviando('enviando');
    const r = await fetch('/api/tutorias/envios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: mentoradaId, materialId }),
    });
    if (!r.ok) {
      setEnviando(r.status === 400 ? 'vazio' : 'erro');
      return;
    }
    setEnviando('parado');
    setRegistrando(false);
    // A mentorada vê o agradecimento; a equipe, que registra uma tutoria por sessão, volta ao formulário em branco.
    if (paraMentorada) setObrigado(true);
    setMexeu(false);
    setDados(null);
    buscas.delete(`${mentoradaId}:${materialId}`);
    await buscar()
      .then(setDados)
      .catch(() => setErro(true));
  };

  if (erro) return <p className="text-sm text-parado">Não foi possível carregar agora.</p>;
  if (!dados) {
    return (
      <p className="flex items-center gap-2 text-sm text-texto-suave">
        <Loader2 aria-hidden size={14} className="animate-spin" />
        Carregando…
      </p>
    );
  }

  const { material, estado, podeEditar } = dados;
  const enviados = estado.envios.filter((e) => e.enviadoEm);
  // Quem escreve depende do material: a mentorada (pré-sessões) ou a equipe (registro de cada tutoria).
  const daEquipe = material.quemPreenche === 'equipe';
  const editando = podeEditar && !obrigado && (daEquipe ? !paraMentorada : paraMentorada);
  // O registro leva o nome do material: "Tutoria terapêutica" → tutoria, "Carteira de investimentos" → carteira.
  const coisa = material.nome.split(/\s+/)[0].toLowerCase();
  const Coisa = coisa.charAt(0).toUpperCase() + coisa.slice(1);
  const rotulo = daEquipe
    ? {
        enviar: `Salvar ${coisa}`,
        caixa: `${Coisa} de`,
        lista: `${Coisa}s registradas`,
        vazio: `Nenhuma ${coisa} registrada ainda.`,
        faltou: 'Preencha ao menos um campo antes de salvar.',
        nova: `Nova ${coisa}`,
        continuar: `Continuar a ${coisa} em andamento`,
      }
    : {
        enviar: 'Enviar respostas',
        caixa: 'Enviada em',
        lista: paraMentorada ? 'Suas respostas anteriores' : 'Respostas enviadas',
        vazio: 'Nenhuma resposta enviada ainda.',
        faltou: 'Responda ao menos uma pergunta antes de enviar.',
        nova: '',
        continuar: '',
      };

  const editor = (
          <div className="space-y-4">
      <FormularioDoApp
        key={estado.rascunho?.envio.id ?? 'novo'}
        perguntas={material.perguntas}
        respostas={estado.rascunho?.respostas ?? {}}
        mentoradaId={mentoradaId}
        podeEditar
        semAviso={daEquipe}
        aoSalvar={() => {
          setMexeu(true);
          // O que estava guardado da busca ficou velho.
          buscas.delete(`${mentoradaId}:${materialId}`);
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-borda pt-4">
        {enviando === 'vazio' ? <p className="text-xs text-parado">{rotulo.faltou}</p> : null}
        {enviando === 'erro' ? <p className="text-xs text-parado">Não foi possível enviar agora. Tente de novo.</p> : null}
        <button
          type="button"
          onClick={enviar}
          disabled={enviando === 'enviando' || (!estado.rascunho && !mexeu)}
          className="inline-flex items-center gap-2 rounded-lg bg-marca px-4 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
        >
          {enviando === 'enviando' ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Send aria-hidden size={14} />}
          {rotulo.enviar}
        </button>
      </div>
    </div>
  );

  if (obrigado && paraMentorada) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="display text-2xl text-marca">Obrigada!</p>
        <p className="text-sm text-texto-suave">Suas respostas foram enviadas para a sua tutora.</p>
        <button type="button" onClick={() => setObrigado(false)} className="text-xs text-texto-suave underline underline-offset-2 hover:text-marca">
          Responder de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {editando && daEquipe ? (
        <button
          type="button"
          onClick={() => setRegistrando(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-marca px-4 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90"
        >
          <Plus aria-hidden size={14} />
          {estado.rascunho ? rotulo.continuar : rotulo.nova}
        </button>
      ) : editando ? (
        editor
      ) : estado.rascunho && !daEquipe && !paraMentorada ? (
        <p className="rounded-lg bg-andamento-suave px-3 py-2 text-xs text-andamento">
          Há uma resposta em preenchimento, ainda não enviada.
        </p>
      ) : null}

      {enviados.length && mostrarEnviadas ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.14em] text-texto-suave uppercase">
            {rotulo.lista} ({enviados.length})
          </p>
          <ul className="space-y-2">
            {enviados.map((e, i) => (
              <li key={e.id}>
                <CaixaDeEnvio
                  envio={e}
                  maisRecente={i === 0}
                  prefixo={rotulo.caixa}
                  perguntas={material.perguntas}
                  mentoradaId={mentoradaId}
                  consulta={consulta}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : !editando || daEquipe ? (
        <p className="text-sm text-texto-suave">{rotulo.vazio}</p>
      ) : null}

      {registrando ? (
        <TelaDasRespostas titulo={rotulo.nova} aoFechar={() => setRegistrando(false)}>
          {editor}
        </TelaDasRespostas>
      ) : null}
    </div>
  );
}

/** Uma caixinha por formulário enviado; ao clicar, as respostas abrem numa tela por cima. */
function CaixaDeEnvio({
  envio,
  maisRecente,
  prefixo,
  perguntas,
  mentoradaId,
  consulta,
}: {
  envio: Envio;
  maisRecente: boolean;
  /** "Enviada em" (pré-sessão) ou "Tutoria de" (registro da equipe). */
  prefixo: string;
  perguntas: Pergunta[];
  mentoradaId: string;
  consulta: string;
}) {
  const [aberta, setAberta] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, Valor> | null>(null);
  const [erro, setErro] = useState(false);

  const abrir = () => {
    setAberta(true);
    if (respostas) return;
    fetch(`/api/tutorias/envios/${envio.id}?${consulta}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ respostas: Record<string, Valor> }>) : Promise.reject(new Error('falhou'))))
      .then((d) => setRespostas(d.respostas))
      .catch(() => setErro(true));
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="flex w-full items-center gap-2.5 rounded-lg border border-borda bg-superficie px-3 py-2.5 text-left text-sm transition hover:border-marca hover:shadow-[var(--sombra)]"
      >
        <span className="font-medium">
          {prefixo} {quando(envio.enviadoEm!)}
        </span>
        {maisRecente ? <span className="rounded-full bg-ok-suave px-2 py-0.5 text-[10.5px] text-ok">mais recente</span> : null}
        <ChevronRight aria-hidden size={14} className="ml-auto shrink-0 text-texto-suave" />
      </button>

      {aberta ? (
        <TelaDasRespostas titulo={`${prefixo} ${quando(envio.enviadoEm!)}`} aoFechar={() => setAberta(false)}>
          {!respostas && !erro ? (
            <p className="flex items-center gap-2 text-sm text-texto-suave">
              <Loader2 aria-hidden size={14} className="animate-spin" />
              Carregando…
            </p>
          ) : null}
          {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
          {respostas ? <FormularioDoApp perguntas={perguntas} respostas={respostas} mentoradaId={mentoradaId} podeEditar={false} /> : null}
        </TelaDasRespostas>
      ) : null}
    </>
  );
}

/** Tela por cima da página, com as respostas de um envio. Fecha no X, no fundo ou no Esc. */
function TelaDasRespostas({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    caixa.current?.focus();
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-texto/35 backdrop-blur-[2px]" />
      <div
        ref={caixa}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-borda bg-superficie shadow-[var(--sombra)] outline-none"
      >
        <div className="flex items-center gap-4 border-b border-borda px-6 py-4">
          <p className="display min-w-0 flex-1 text-xl leading-tight">{titulo}</p>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
          >
            <X aria-hidden size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
