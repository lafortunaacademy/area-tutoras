'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import { EtiquetaNotion } from '@/components/EtiquetaNotion';
import { CartaoSessao, dataCurta } from '@/components/area-mentorada/ListaDeSessoes';

/**
 * As sessões do ciclo atual que são deste pilar. A tabela só abre as sessões (quem
 * cria e ajusta é o administrativo); o que se edita fica dentro de cada uma.
 */
export function SessoesDoPilar({ mentoradaId, sessoes }: { mentoradaId: string; sessoes: SessaoDaLista[] }) {
  const [aberta, setAberta] = useState<SessaoDaLista | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-borda">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-borda text-left">
              {['Status', 'Sessão', 'Tutoras', 'Data realizada', ''].map((c, i) => (
                <th key={i} className="px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-texto-suave">
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
                <tr
                  key={s.id}
                  onClick={() => setAberta(s)}
                  className="cursor-pointer border-b border-borda/60 transition last:border-0 hover:bg-fundo"
                >
                  <td className="px-3 py-1 whitespace-nowrap">
                    <EtiquetaNotion texto={s.status} cor={s.corStatus} />
                  </td>
                  <td className="px-3 py-1 font-medium">
                    <button type="button" onClick={() => setAberta(s)} className="text-left hover:text-marca">
                      {s.sessao || <span className="text-texto-suave">Sem nome</span>}
                    </button>
                  </td>
                  <td className="px-3 py-1 text-texto-suave">
                    {s.equipe?.length ? (
                      <span className="flex flex-col gap-0.5">
                        {s.equipe.map((t) => (
                          <span key={t.id} className="flex items-center gap-2 whitespace-nowrap">
                            <FotoDaTutora id={t.id} nome={t.nome} />
                            {t.nome}
                          </span>
                        ))}
                      </span>
                    ) : (
                      s.tutoras.join(', ') || '—'
                    )}
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap text-texto-suave tabular-nums">{dataCurta(s.dataRealizada)}</td>
                  <td className="w-8 px-2 py-1 text-texto-suave">
                    <ChevronRight aria-hidden size={14} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {aberta ? <CartaoSessao sessao={aberta} mentoradaId={mentoradaId} aoFechar={() => setAberta(null)} /> : null}
    </>
  );
}

/** Foto redonda da tutora; sem foto, a inicial do nome. */
function FotoDaTutora({ id, nome }: { id: string; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return (
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[10px] font-medium text-texto">
        {nome.charAt(0)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- já sai reduzida e em cache pela rota
    <img
      src={`/api/fotos/tutoras/${id}?tamanho=mini`}
      alt=""
      loading="lazy"
      onError={() => setFalhou(true)}
      className="size-5 shrink-0 rounded-full bg-marca-suave object-cover object-top"
    />
  );
}
