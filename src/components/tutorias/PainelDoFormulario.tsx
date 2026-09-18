'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, History, Loader2, Send } from 'lucide-react';
import type { Pergunta } from '@/lib/tutorias/modelo';
import type { Envio, EstadoDoFormulario, Valor } from '@/lib/tutorias/respostas';
import { FormularioDoApp } from './FormularioDoApp';

type Dados = { material: { perguntas: Pergunta[] }; estado: EstadoDoFormulario; podeEditar: boolean };

const quando = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

/**
 * Um formulário que pode ser respondido várias vezes (a pré-sessão de cada
 * sessão). Mostra a última resposta enviada, com a data; quem pode editar
 * preenche de novo e envia, e as anteriores ficam no histórico.
 */
export function PainelDoFormulario({
  materialId,
  mentoradaId,
  token,
}: {
  materialId: string;
  mentoradaId: string;
  /** Link de preenchimento, quando a pessoa entrou por ele. */
  token?: string;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  // "novo": preenchendo uma resposta nova, depois de já ter enviado alguma.
  const [novo, setNovo] = useState(false);
  const [mexeu, setMexeu] = useState(false);
  const [enviando, setEnviando] = useState<'parado' | 'enviando' | 'vazio' | 'erro'>('parado');
  const [anterior, setAnterior] = useState<{ envio: Envio; respostas: Record<string, Valor> } | null>(null);

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
    setNovo(false);
    setMexeu(false);
    setDados(null);
    await buscar()
      .then(setDados)
      .catch(() => setErro(true));
  };

  const abrirAnterior = async (e: Envio) => {
    const r = await fetch(`/api/tutorias/envios/${e.id}?${consulta}`);
    if (r.ok) setAnterior((await r.json()) as { envio: Envio; respostas: Record<string, Valor> });
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

  if (anterior) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setAnterior(null)} className="inline-flex items-center gap-1.5 text-xs text-texto-suave hover:text-marca">
          <ArrowLeft aria-hidden size={13} />
          Voltar
        </button>
        <p className="text-xs text-texto-suave">Resposta enviada em {quando(anterior.envio.enviadoEm!)}</p>
        <FormularioDoApp perguntas={material.perguntas} respostas={anterior.respostas} mentoradaId={mentoradaId} podeEditar={false} />
      </div>
    );
  }

  // O que aparece: quem edita vê o rascunho (ou um em branco); quem só lê, o último enviado.
  const editando = podeEditar && (Boolean(estado.rascunho) || novo || !estado.ultimo);
  const mostrado = editando ? (estado.rascunho?.respostas ?? {}) : (estado.ultimo?.respostas ?? estado.rascunho?.respostas ?? {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-texto-suave">
        {estado.ultimo ? (
          <span>
            Última resposta enviada em <strong className="font-medium text-texto">{quando(estado.ultimo.envio.enviadoEm!)}</strong>
          </span>
        ) : (
          <span>Ainda não foi enviada nenhuma resposta.</span>
        )}
        {enviados.length > (editando ? 0 : 1) ? (
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-marca [&::-webkit-details-marker]:hidden">
              <History aria-hidden size={13} />
              Respostas anteriores ({editando ? enviados.length : enviados.length - 1})
            </summary>
            <ul className="absolute z-10 mt-1 min-w-48 rounded-lg border border-borda bg-superficie p-1 shadow-[var(--sombra)]">
              {(editando ? enviados : enviados.slice(1)).map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => abrirAnterior(e)} className="w-full rounded-md px-2 py-1.5 text-left hover:bg-superficie-2">
                    {quando(e.enviadoEm!)}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {editando && estado.ultimo ? (
        <p className="rounded-lg bg-andamento-suave px-3 py-2 text-xs text-andamento">
          Você está preenchendo uma resposta nova. A de {quando(estado.ultimo.envio.enviadoEm!)} continua guardada.
        </p>
      ) : null}
      {!podeEditar && !estado.ultimo && estado.rascunho ? (
        <p className="rounded-lg bg-andamento-suave px-3 py-2 text-xs text-andamento">Em preenchimento, ainda não enviada.</p>
      ) : null}

      <FormularioDoApp
        key={editando ? (estado.rascunho?.envio.id ?? 'novo') : (estado.ultimo?.envio.id ?? 'vazio')}
        perguntas={material.perguntas}
        respostas={mostrado}
        mentoradaId={mentoradaId}
        podeEditar={editando}
        token={token}
        aoSalvar={() => setMexeu(true)}
      />

      {podeEditar ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-borda pt-4">
          {enviando === 'vazio' ? <p className="text-xs text-parado">Responda ao menos uma pergunta antes de enviar.</p> : null}
          {enviando === 'erro' ? <p className="text-xs text-parado">Não foi possível enviar agora. Tente de novo.</p> : null}
          {editando ? (
            <button
              type="button"
              onClick={enviar}
              disabled={enviando === 'enviando' || (!estado.rascunho && !mexeu)}
              className="inline-flex items-center gap-2 rounded-lg bg-marca px-4 py-2 text-sm font-medium text-marca-contraste transition hover:opacity-90 disabled:opacity-50"
            >
              {enviando === 'enviando' ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <Send aria-hidden size={14} />}
              Enviar respostas
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setNovo(true)}
              className="rounded-lg border border-marca px-4 py-2 text-sm font-medium text-marca transition hover:bg-marca hover:text-marca-contraste"
            >
              Preencher de novo
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
