'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { alternarTarefa } from '@/app/mentoradas/actions';

export type Tarefa = {
  id: string;
  tarefa: string;
  /** Já formatado ("20/09/2026"), ou vazio. */
  prazo: string;
  observacoes: string;
  feita: boolean;
};

const ABAS = [
  { chave: 'fazer', rotulo: 'A fazer', vazio: 'Nenhuma tarefa pendente.' },
  { chave: 'feitas', rotulo: 'Feitas', vazio: 'Nenhuma tarefa concluída ainda.' },
  { chave: 'todas', rotulo: 'Todas', vazio: 'Nenhuma tarefa ainda.' },
] as const;

type Aba = (typeof ABAS)[number]['chave'];

/**
 * As tarefas da mentoria, separadas como no Notion: a fazer, feitas, todas.
 * Criar ou marcar como feita aqui grava na mesma base do Notion.
 */
export function Tarefas({
  mentoradaId,
  tarefas,
  somenteLeitura = false,
  aoMudar,
  adicionarEmLinha,
  semBotaoAdicionar = false,
}: {
  mentoradaId: string;
  tarefas: Tarefa[];
  /** Sem criar nem marcar (a tutora, que não mexe nas tarefas da mentorada). */
  somenteLeitura?: boolean;
  /** Depois de marcar: quem buscou a lista por fora recarrega. */
  aoMudar?: () => void;
  /**
   * Como adicionar na linha de baixo da tabela. Sem ela, a linha grava direto na
   * base de tarefas e recarrega a página (a seção Tarefas da mentoria).
   */
  adicionarEmLinha?: (dados: { tarefa: string; prazo: string; observacoes: string }) => Promise<boolean>;
  /** Sem a linha de adicionar. */
  semBotaoAdicionar?: boolean;
}) {
  const [aba, setAba] = useState<Aba>('fazer');
  const atual = ABAS.find((a) => a.chave === aba)!;
  const router = useRouter();
  // Criadas aqui: aparecem na hora, antes de a página recarregar do Notion.
  const [novas, setNovas] = useState<Tarefa[]>([]);
  const [criando, setCriando] = useState(false);
  const todas = [...tarefas, ...novas.filter((n) => !tarefas.some((t) => t.id === n.id))];

  const adicionarNaBase = async (dados: { tarefa: string; prazo: string; observacoes: string }) => {
    const r = await fetch('/api/tutorias/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mentorada: mentoradaId, ...dados }),
    }).catch(() => null);
    if (!r?.ok) return false;
    const { tarefa } = (await r.json()) as { tarefa: Tarefa };
    setNovas((n) => [...n, tarefa]);
    router.refresh();
    return true;
  };
  // Quem passa `adicionarEmLinha` já decidiu que pode adicionar: a tutora adiciona
  // próximos passos mesmo sem poder marcar as tarefas como feitas.
  const adicionar = adicionarEmLinha ?? (somenteLeitura || semBotaoAdicionar ? undefined : adicionarNaBase);

  const visiveis = todas.filter((t) =>
    aba === 'todas' ? true : aba === 'feitas' ? t.feita : !t.feita,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filtrar tarefas" className="flex gap-1">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              aba === a.chave
                ? 'bg-marca font-medium text-marca-contraste'
                : 'text-texto-suave hover:bg-fundo hover:text-texto'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
        </div>

      </div>

      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full min-w-[36rem] table-fixed text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {[
                ['Status', 'w-20'],
                ['Tarefa', ''],
                ['Prazo', 'w-36'],
                ['Observações', 'w-1/3'],
              ].map(([nome, largura]) => (
                <th
                  key={nome}
                  className={`rotulo px-4 py-2.5 text-[10px] font-normal whitespace-nowrap text-texto-suave ${largura}`}
                >
                  {nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-texto-suave">
                  {atual.vazio}
                </td>
              </tr>
            ) : (
              visiveis.map((t) => (
                <tr key={t.id} className="border-b border-borda last:border-0">
                  <td className="px-4 py-2">
                    {somenteLeitura ? (
                      <span
                        aria-label={t.feita ? 'Feita' : 'A fazer'}
                        className={`flex size-5 items-center justify-center rounded-md border ${
                          t.feita ? 'border-marca bg-marca text-marca-contraste' : 'border-borda bg-superficie'
                        }`}
                      >
                        {t.feita ? <Check aria-hidden size={13} strokeWidth={3} /> : null}
                      </span>
                    ) : (
                      <form
                        action={async (dados) => {
                          await alternarTarefa(dados);
                          aoMudar?.();
                        }}
                      >
                        <input type="hidden" name="mentoradaId" value={mentoradaId} />
                        <input type="hidden" name="tarefaId" value={t.id} />
                        <input type="hidden" name="feita" value={String(!t.feita)} />
                        <CaixaFeita feita={t.feita} tarefa={t.tarefa} />
                      </form>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2.5 [overflow-wrap:anywhere] whitespace-pre-line ${t.feita ? 'text-texto-suave line-through' : ''}`}
                    title={t.tarefa}
                  >
                    {t.tarefa}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">{t.prazo}</td>
                  <td className="px-4 py-2.5 [overflow-wrap:anywhere] whitespace-pre-line text-texto-suave" title={t.observacoes}>
                    {t.observacoes}
                  </td>
                </tr>
              ))
            )}
            {adicionar ? <LinhaNova adicionar={adicionar} aberta={criando} aoFechar={() => setCriando(false)} /> : null}
          </tbody>
        </table>
      </div>

      {adicionar && !criando ? (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-marca-contraste transition hover:opacity-90"
        >
          <Plus aria-hidden size={14} />
          Nova tarefa
        </button>
      ) : null}
    </div>
  );
}

type NovaTarefa = { tarefa: string; prazo: string; observacoes: string };

/**
 * A linha de escrever uma tarefa, aberta pelo botão "Nova tarefa". Salvar (ou
 * Enter) manda gravar: a tarefa sobe para a lista na hora, esmaecida enquanto
 * grava, e a linha fica limpa para a próxima. Esc ou o X fecham.
 */
function LinhaNova({
  adicionar,
  aberta,
  aoFechar,
}: {
  adicionar: (dados: NovaTarefa) => Promise<boolean>;
  aberta: boolean;
  aoFechar: () => void;
}) {
  const [tarefa, setTarefa] = useState('');
  const [prazo, setPrazo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [gravando, setGravando] = useState<(NovaTarefa & { chave: number })[]>([]);
  const [erro, setErro] = useState(false);
  const campoTarefa = useRef<HTMLInputElement>(null);

  const fechar = () => {
    setTarefa('');
    setPrazo('');
    setObservacoes('');
    setErro(false);
    aoFechar();
  };

  const enviar = () => {
    if (!tarefa.trim()) {
      campoTarefa.current?.focus();
      return;
    }
    const nova = { tarefa: tarefa.trim(), prazo, observacoes: observacoes.trim(), chave: Date.now() };
    setGravando((g) => [...g, nova]);
    setTarefa('');
    setPrazo('');
    setObservacoes('');
    setErro(false);
    campoTarefa.current?.focus();

    void adicionar(nova).then((ok) => {
      setGravando((g) => g.filter((x) => x.chave !== nova.chave));
      if (!ok) {
        setTarefa(nova.tarefa);
        setPrazo(nova.prazo);
        setObservacoes(nova.observacoes);
        setErro(true);
      }
    });
  };
  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviar();
    }
    if (e.key === 'Escape') fechar();
  };
  const campo =
    'w-full rounded-md border border-borda bg-superficie px-2 py-1.5 text-[13px] outline-none placeholder:text-texto-suave/70 focus:border-marca';

  return (
    <>
      {gravando.map((g) => (
        <tr key={g.chave} className="border-t border-borda opacity-60">
          <td className="px-4 py-2">
            <Loader2 aria-label="Salvando" size={14} className="animate-spin text-texto-suave" />
          </td>
          <td className="px-4 py-2.5 [overflow-wrap:anywhere] whitespace-pre-line">{g.tarefa}</td>
          <td className="px-4 py-2.5 whitespace-nowrap text-texto-suave tabular-nums">
            {g.prazo ? g.prazo.split('-').reverse().join('/') : ''}
          </td>
          <td className="px-4 py-2.5 [overflow-wrap:anywhere] whitespace-pre-line text-texto-suave">{g.observacoes}</td>
        </tr>
      ))}
      {aberta ? (
        <tr className="border-t border-borda bg-marca-suave/40">
          <td className="px-3 py-2 align-top">
            <button
              type="button"
              onClick={enviar}
              className="mt-0.5 rounded-md bg-marca px-2 py-1 text-[11px] font-medium text-marca-contraste transition hover:opacity-90"
            >
              Salvar
            </button>
          </td>
          <td className="px-2 py-2">
            <input
              ref={campoTarefa}
              autoFocus
              value={tarefa}
              onChange={(e) => setTarefa(e.target.value)}
              onKeyDown={aoTeclar}
              placeholder="Nova tarefa"
              aria-label="Nova tarefa"
              className={campo}
            />
            <p className={`mt-1 px-1 text-[11px] ${erro ? 'text-parado' : 'text-texto-suave'}`}>
              {erro ? 'Não salvou. Tente de novo.' : 'Enter também salva · Esc cancela'}
            </p>
          </td>
          <td className="px-2 py-2 align-top">
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} onKeyDown={aoTeclar} aria-label="Prazo" className={`${campo} tabular-nums`} />
          </td>
          <td className="px-2 py-2 align-top">
            <div className="flex items-center gap-1">
              <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} onKeyDown={aoTeclar} placeholder="Edite aqui" aria-label="Observações" className={campo} />
              <button
                type="button"
                onClick={fechar}
                aria-label="Cancelar"
                title="Cancelar"
                className="shrink-0 rounded-md p-1 text-texto-suave transition hover:bg-superficie-2 hover:text-texto"
              >
                <X aria-hidden size={14} />
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CaixaFeita({ feita, tarefa }: { feita: boolean; tarefa: string }) {
  const { pending } = useFormStatus();
  // Enquanto grava, a caixa já mostra o estado novo.
  const marcada = pending ? !feita : feita;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={feita ? `Desmarcar "${tarefa}"` : `Marcar "${tarefa}" como feita`}
      aria-pressed={marcada}
      className={`flex size-5 items-center justify-center rounded-md border transition ${
        marcada ? 'border-marca bg-marca text-marca-contraste' : 'border-borda bg-superficie hover:border-marca'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {marcada ? <Check aria-hidden size={13} strokeWidth={3} /> : null}
    </button>
  );
}
