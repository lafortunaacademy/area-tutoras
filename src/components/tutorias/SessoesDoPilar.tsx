'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { EdicaoDaSessao, OpcoesDasSessoes, SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { CartaoSessao, dataCurta } from '@/components/area-mentorada/ListaDeSessoes';

/**
 * As sessões do ciclo atual que são deste pilar. Quem pode editar muda status,
 * nome, tutoras e data realizada direto na tabela, e isso é gravado na base de
 * sessões; a seta abre a sessão no mesmo cartão da página Sessões.
 */
export function SessoesDoPilar({
  mentoradaId,
  sessoes: iniciais,
  opcoes,
  podeEditar = false,
}: {
  mentoradaId: string;
  sessoes: SessaoDaLista[];
  opcoes?: OpcoesDasSessoes | null;
  podeEditar?: boolean;
}) {
  const [sessoes, setSessoes] = useState(iniciais);
  const [aberta, setAberta] = useState<SessaoDaLista | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const editavel = podeEditar && Boolean(opcoes);

  async function salvar(s: SessaoDaLista, edicao: EdicaoDaSessao, previa: Partial<SessaoDaLista>) {
    const antes = sessoes;
    setErro(null);
    setSalvando(s.id);
    setSessoes((l) => l.map((x) => (x.id === s.id ? { ...x, ...previa } : x)));
    try {
      const r = await fetch(`/api/sessoes/${s.id}?mentorada=${encodeURIComponent(mentoradaId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edicao),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro ?? 'Não foi possível salvar agora.');
      setSessoes((l) => l.map((x) => (x.id === s.id ? (j.sessao as SessaoDaLista) : x)));
    } catch (e) {
      setSessoes(antes);
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar agora.');
    } finally {
      setSalvando(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-borda text-left">
              {['Status', 'Sessão', 'Tutoras', 'Data realizada', ''].map((c, i) => (
                <th key={i} className="px-3 py-2 text-[11px] font-medium whitespace-nowrap text-texto-suave">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-texto-suave">
                  Nenhuma sessão ainda.
                </td>
              </tr>
            ) : (
              sessoes.map((s) => (
                <tr key={s.id} className="border-b border-borda/60 transition last:border-0 hover:bg-fundo">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editavel && opcoes ? (
                      <label className="relative inline-flex cursor-pointer items-center gap-1">
                        <EtiquetaNotion texto={s.status || 'Sem status'} cor={s.corStatus} />
                        <ChevronDown aria-hidden size={12} className="text-texto-suave" />
                        <select
                          aria-label={`Status de ${s.sessao}`}
                          value={s.status}
                          onChange={(e) => {
                            const cor = opcoes.status.find((o) => o.nome === e.target.value)?.cor ?? 'default';
                            void salvar(s, { status: e.target.value }, { status: e.target.value, corStatus: cor, realizada: e.target.value === 'Realizada' });
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                        >
                          {s.status ? null : <option value="">Sem status</option>}
                          {opcoes.status.map((o) => (
                            <option key={o.nome} value={o.nome}>
                              {o.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <EtiquetaNotion texto={s.status} cor={s.corStatus} />
                    )}
                  </td>
                  <td className="min-w-48 px-3 py-2 font-medium">
                    {editavel ? (
                      <NomeDaSessao
                        key={s.sessao}
                        valor={s.sessao}
                        aoSalvar={(nome) => void salvar(s, { sessao: nome }, { sessao: nome })}
                      />
                    ) : (
                      <button type="button" onClick={() => setAberta(s)} className="text-left hover:text-marca">
                        {s.sessao || <span className="text-texto-suave">Sem nome</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-texto-suave">
                    {editavel && opcoes ? (
                      <EscolherTutoras
                        tutoras={opcoes.tutoras}
                        escolhidas={s.tutoraIds}
                        aoSalvar={(ids) =>
                          void salvar(s, { tutoraIds: ids }, {
                            tutoraIds: ids,
                            tutoras: ids.map((id) => opcoes.tutoras.find((t) => t.id === id)?.nome ?? '').filter(Boolean),
                          })
                        }
                        nomes={s.tutoras}
                      />
                    ) : (
                      s.tutoras.join(', ') || '—'
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-texto-suave tabular-nums">
                    {editavel ? (
                      <input
                        type="date"
                        aria-label={`Data realizada de ${s.sessao}`}
                        value={s.dataRealizada?.slice(0, 10) ?? ''}
                        onChange={(e) => {
                          const v = e.target.value || null;
                          void salvar(s, { dataRealizada: v }, { dataRealizada: v, data: v ?? s.dataPrevista });
                        }}
                        className="rounded-md bg-transparent px-1 py-0.5 text-texto-suave outline-none hover:bg-superficie-2 focus:bg-superficie-2"
                      />
                    ) : (
                      dataCurta(s.dataRealizada)
                    )}
                  </td>
                  <td className="w-8 px-2 text-texto-suave">
                    {salvando === s.id ? (
                      <Loader2 aria-label="Salvando" size={14} className="animate-spin" />
                    ) : (
                      <button
                        type="button"
                        aria-label={`Abrir ${s.sessao}`}
                        onClick={() => setAberta(s)}
                        className="rounded p-0.5 transition hover:bg-superficie-2 hover:text-texto"
                      >
                        <ChevronRight aria-hidden size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {erro ? <p className="mt-2 text-xs text-parado">{erro}</p> : null}

      {aberta ? <CartaoSessao sessao={aberta} mentoradaId={mentoradaId} aoFechar={() => setAberta(null)} /> : null}
    </>
  );
}

/** Nome editável no lugar; grava ao sair do campo ou no Enter, e o Esc desfaz. */
function NomeDaSessao({ valor, aoSalvar }: { valor: string; aoSalvar: (nome: string) => void }) {
  const [texto, setTexto] = useState(valor);

  function terminar() {
    const nome = texto.trim();
    if (!nome) return setTexto(valor);
    if (nome !== valor) aoSalvar(nome);
  }

  return (
    <input
      value={texto}
      aria-label="Nome da sessão"
      placeholder="Edite aqui"
      onChange={(e) => setTexto(e.target.value)}
      onBlur={terminar}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setTexto(valor);
          requestAnimationFrame(() => e.currentTarget?.blur());
        }
      }}
      className="w-full rounded-md bg-transparent px-1 py-0.5 font-medium outline-none hover:bg-superficie-2 focus:bg-superficie-2"
    />
  );
}

/** Lista das tutoras com caixinhas; grava quando a lista fecha, se algo mudou. */
function EscolherTutoras({
  tutoras,
  escolhidas,
  nomes,
  aoSalvar,
}: {
  tutoras: OpcoesDasSessoes['tutoras'];
  escolhidas: string[];
  nomes: string[];
  aoSalvar: (ids: string[]) => void;
}) {
  // Posição na tela: a lista sai da tabela, que corta o que passa da borda.
  const [aberto, setAberto] = useState<{ top: number; left: number } | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>(escolhidas);
  const [busca, setBusca] = useState('');
  const caixa = useRef<HTMLDivElement>(null);
  // Refeito a cada render de propósito: fecha com as marcações do momento.
  useEffect(() => {
    if (!aberto) return;
    const fechar = () => {
      setAberto(null);
      const mudou = marcadas.length !== escolhidas.length || marcadas.some((id) => !escolhidas.includes(id));
      if (mudou) aoSalvar(marcadas);
    };
    const fora = (ev: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(ev.target as Node)) fechar();
    };
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') fechar();
    };
    // Presa na tela, a lista ficaria para trás ao rolar a página: rolar fecha.
    const rolar = (ev: Event) => {
      if (caixa.current && !caixa.current.contains(ev.target as Node)) fechar();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', rolar, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', rolar, true);
    };
  }, [aberto, marcadas, escolhidas, aoSalvar]);

  const visiveis = tutoras.filter((t) => t.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div ref={caixa}>
      <button
        type="button"
        onClick={(e) => {
          if (aberto) return;
          const r = e.currentTarget.getBoundingClientRect();
          setMarcadas(escolhidas);
          setBusca('');
          setAberto({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 256) });
        }}
        className="rounded-md px-1 py-0.5 text-left hover:bg-superficie-2"
      >
        {nomes.join(', ') || <span className="text-texto-suave/70">Edite aqui</span>}
      </button>

      {aberto ? (
        <div
          style={{ top: aberto.top, left: aberto.left }}
          className="fixed z-40 w-60 rounded-xl border border-borda bg-superficie p-2 shadow-[var(--sombra)]"
        >
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tutora"
            className="mb-1 w-full rounded-md border border-borda bg-fundo px-2 py-1 text-xs outline-none focus:border-marca"
          />
          <ul className="max-h-56 overflow-y-auto">
            {visiveis.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-texto hover:bg-fundo">
                  <input
                    type="checkbox"
                    checked={marcadas.includes(t.id)}
                    onChange={(e) =>
                      setMarcadas((m) => (e.target.checked ? [...m, t.id] : m.filter((id) => id !== t.id)))
                    }
                    className="accent-[var(--marca)]"
                  />
                  {t.nome}
                </label>
              </li>
            ))}
            {visiveis.length === 0 ? <li className="px-2 py-1 text-xs text-texto-suave">Nenhuma tutora.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
