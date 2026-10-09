'use client';

import { useState } from 'react';
import { Link2, Loader2, RefreshCw } from 'lucide-react';
import type { RespostaDoMapa } from '@/lib/notion/mapas';

/**
 * As respostas do formulário "Mapa da cliente" que o app não conseguiu ligar
 * sozinho — quem respondeu com um e-mail que não é o do acesso e com o nome
 * escrito diferente. Aqui o administrativo escolhe a mentorada e a resposta
 * passa a aparecer na área dela, no Notion e no app.
 */
export function RespostasDoMapa({
  pendentes: iniciais,
  mentoradas,
}: {
  pendentes: RespostaDoMapa[];
  mentoradas: { id: string; nome: string }[];
}) {
  const [pendentes, setPendentes] = useState(iniciais);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const procurar = async () => {
    setOcupado('todas');
    setRecado(null);
    const r = await fetch('/api/mapas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(
      () => null,
    );
    setOcupado(null);
    if (!r?.ok) return setRecado('Não deu para buscar agora.');
    const { ligadas, pendentes: sobraram } = (await r.json()) as {
      ligadas: { nome: string }[];
      pendentes: RespostaDoMapa[];
    };
    setPendentes(sobraram);
    setRecado(
      ligadas.length
        ? `${ligadas.length} ${ligadas.length === 1 ? 'resposta ligada' : 'respostas ligadas'}: ${ligadas.map((l) => l.nome).join(', ')}.`
        : 'Nenhuma resposta nova para ligar.',
    );
  };

  const ligar = async (respostaId: string, mentoradaId: string) => {
    if (!mentoradaId) return;
    setOcupado(respostaId);
    setRecado(null);
    const r = await fetch('/api/mapas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resposta: respostaId, mentorada: mentoradaId }),
    }).catch(() => null);
    setOcupado(null);
    if (!r?.ok) return setRecado('Não deu para ligar essa resposta.');
    setPendentes((l) => l.filter((p) => p.id !== respostaId));
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void procurar()}
          disabled={ocupado !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-medium transition hover:border-marca hover:text-marca disabled:opacity-60"
        >
          {ocupado === 'todas' ? <Loader2 aria-hidden size={14} className="animate-spin" /> : <RefreshCw aria-hidden size={14} />}
          Buscar respostas novas
        </button>
        {recado ? <span className="text-xs text-texto-suave">{recado}</span> : null}
      </div>

      {pendentes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
          Nenhuma resposta esperando. As que chegam com o e-mail ou o nome da mentorada são ligadas sozinhas.
        </p>
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
          {pendentes.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.nome || 'Sem nome'}</p>
                <p className="text-xs text-texto-suave">
                  {p.email || 'sem e-mail'}
                  {p.criadaEm ? ` · ${p.criadaEm.slice(0, 10).split('-').reverse().join('/')}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  defaultValue=""
                  aria-label={`Mentorada de ${p.nome}`}
                  onChange={(e) => void ligar(p.id, e.target.value)}
                  disabled={ocupado !== null}
                  className="rounded-lg border border-borda bg-superficie px-2 py-1.5 text-xs outline-none focus:border-marca"
                >
                  <option value="">Ligar a…</option>
                  {mentoradas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                {ocupado === p.id ? (
                  <Loader2 aria-hidden size={14} className="animate-spin text-texto-suave" />
                ) : (
                  <Link2 aria-hidden size={14} className="text-texto-suave" />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
