'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, Send } from 'lucide-react';
import type { Pergunta } from '@/lib/tutorias/modelo';
import type { Envio, EstadoDoFormulario, Valor } from '@/lib/tutorias/respostas';
import { FormularioDoApp } from './FormularioDoApp';

type Dados = { material: { perguntas: Pergunta[] }; estado: EstadoDoFormulario; podeEditar: boolean };

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
  token,
  paraMentorada = false,
  mostrarEnviadas = true,
}: {
  materialId: string;
  mentoradaId: string;
  /** Link de preenchimento, quando a pessoa entrou por ele. */
  token?: string;
  /** Quem preenche é a própria mentorada: sempre uma resposta nova, textos para ela. */
  paraMentorada?: boolean;
  /** As caixinhas das respostas já enviadas (no link de preenchimento ficam de fora). */
  mostrarEnviadas?: boolean;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [mexeu, setMexeu] = useState(false);
  // Acabou de enviar: a mentorada vê o agradecimento em vez de um formulário novo.
  const [obrigado, setObrigado] = useState(false);
  const [enviando, setEnviando] = useState<'parado' | 'enviando' | 'vazio' | 'erro'>('parado');

  const consulta = `mentorada=${encodeURIComponent(mentoradaId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

  const buscar = useCallback(async (): Promise<Dados> => {
    const r = await fetch(`/api/tutorias/materiais/${materialId}?${consulta}`);
    if (!r.ok) throw new Error('falhou');
    return (await r.json()) as Dados;
  }, [materialId, consulta]);

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
      body: JSON.stringify({ mentorada: mentoradaId, materialId, token }),
    });
    if (!r.ok) {
      setEnviando(r.status === 400 ? 'vazio' : 'erro');
      return;
    }
    setEnviando('parado');
    if (paraMentorada) setObrigado(true);
    setMexeu(false);
    setDados(null);
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
  // Quem preenche é a mentorada (no link ou logada); a equipe só vê as respostas enviadas.
  const editando = podeEditar && paraMentorada && !obrigado;

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
      {podeEditar ? (
        editando ? (
          <div className="space-y-4">
            {enviados.length && !paraMentorada ? (
              <p className="rounded-lg bg-andamento-suave px-3 py-2 text-xs text-andamento">
                Resposta nova. As já enviadas continuam guardadas logo abaixo.
              </p>
            ) : null}
            <FormularioDoApp
              key={estado.rascunho?.envio.id ?? 'novo'}
              perguntas={material.perguntas}
              respostas={estado.rascunho?.respostas ?? {}}
              mentoradaId={mentoradaId}
              podeEditar
              token={token}
              aoSalvar={() => setMexeu(true)}
            />
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-borda pt-4">
              {enviando === 'vazio' ? <p className="text-xs text-parado">Responda ao menos uma pergunta antes de enviar.</p> : null}
              {enviando === 'erro' ? <p className="text-xs text-parado">Não foi possível enviar agora. Tente de novo.</p> : null}
              <button
                type="button"
                onClick={enviar}
                disabled={enviando === 'enviando' || (!estado.rascunho && !mexeu)}
                className="inline-flex items-center gap-2 rounded-lg bg-marca px-4 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
              >
                {enviando === 'enviando' ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Send aria-hidden size={14} />}
                Enviar respostas
              </button>
            </div>
          </div>
        ) : null
      ) : estado.rascunho ? (
        <p className="rounded-lg bg-andamento-suave px-3 py-2 text-xs text-andamento">
          Há uma resposta em preenchimento, ainda não enviada.
        </p>
      ) : null}

      {enviados.length && mostrarEnviadas ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.14em] text-texto-suave uppercase">
            {paraMentorada ? 'Suas respostas anteriores' : 'Respostas enviadas'} ({enviados.length})
          </p>
          <ul className="space-y-2">
            {enviados.map((e, i) => (
              <li key={e.id}>
                <CaixaDeEnvio
                  envio={e}
                  maisRecente={i === 0}
                  perguntas={material.perguntas}
                  mentoradaId={mentoradaId}
                  consulta={consulta}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : !podeEditar ? (
        <p className="text-sm text-texto-suave">Nenhuma resposta enviada ainda.</p>
      ) : null}
    </div>
  );
}

/** Uma caixinha por formulário enviado; as respostas carregam quando ela abre. */
function CaixaDeEnvio({
  envio,
  maisRecente,
  perguntas,
  mentoradaId,
  consulta,
}: {
  envio: Envio;
  maisRecente: boolean;
  perguntas: Pergunta[];
  mentoradaId: string;
  consulta: string;
}) {
  const [respostas, setRespostas] = useState<Record<string, Valor> | null>(null);
  const [erro, setErro] = useState(false);

  const abrir = () => {
    if (respostas) return;
    fetch(`/api/tutorias/envios/${envio.id}?${consulta}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ respostas: Record<string, Valor> }>) : Promise.reject(new Error('falhou'))))
      .then((d) => setRespostas(d.respostas))
      .catch(() => setErro(true));
  };

  return (
    <details
      className="group rounded-lg border border-borda bg-superficie"
      onToggle={(ev) => {
        if ((ev.currentTarget as HTMLDetailsElement).open) abrir();
      }}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden size={14} className="shrink-0 text-texto-suave transition-transform group-open:rotate-90" />
        <span className="font-medium">Enviada em {quando(envio.enviadoEm!)}</span>
        {maisRecente ? <span className="rounded-full bg-ok-suave px-2 py-0.5 text-[10.5px] text-ok">mais recente</span> : null}
      </summary>
      <div className="border-t border-borda px-4 py-4">
        {!respostas && !erro ? (
          <p className="flex items-center gap-2 text-sm text-texto-suave">
            <Loader2 aria-hidden size={14} className="animate-spin" />
            Carregando…
          </p>
        ) : null}
        {erro ? <p className="text-sm text-parado">Não foi possível carregar agora.</p> : null}
        {respostas ? <FormularioDoApp perguntas={perguntas} respostas={respostas} mentoradaId={mentoradaId} podeEditar={false} /> : null}
      </div>
    </details>
  );
}
