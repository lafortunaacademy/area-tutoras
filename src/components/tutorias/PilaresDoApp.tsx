import { ChevronRight } from 'lucide-react';
import type { Pilar } from '@/lib/tutorias/modelo';
import type { Progresso } from '@/lib/tutorias/respostas';
import type { OpcoesDasSessoes, SessaoDaLista } from '@/lib/notion/sessoesDaMentorada';
import { ArvoreDeMateriais } from './ArvoreDeMateriais';
import { IconeDoModelo } from './IconeDoModelo';
import { SessoesDoPilar } from './SessoesDoPilar';

/** Os pilares das tutorias, com a frase e um toggle por tutoria. Tudo do próprio app. */
export function PilaresDoApp({
  pilares,
  mentoradaId,
  progresso,
  sessoes = null,
  opcoesDasSessoes = null,
  podeEditarSessoes = false,
  admin,
  paraMentorada = false,
}: {
  pilares: Pilar[];
  mentoradaId: string;
  progresso: Progresso;
  /** Sessões do ciclo atual por pilar; `null` quando o Notion não respondeu. */
  sessoes?: Record<string, SessaoDaLista[]> | null;
  opcoesDasSessoes?: OpcoesDasSessoes | null;
  /** Status, nome, tutoras e data das sessões editáveis na tabela (grava na base de sessões). */
  podeEditarSessoes?: boolean;
  admin: boolean;
  /** Quem está vendo é a própria mentorada. */
  paraMentorada?: boolean;
}) {
  return (
    <div className="space-y-4">
      {pilares.map((p) => (
        <section key={p.id} className="min-w-0 rounded-2xl border border-borda bg-superficie p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-base font-medium">
            <IconeDoModelo icone={p.icone} tamanho={16} />
            Pilar: {p.nome}
          </h3>

          {p.frase.length ? (
            <p className="mt-3 border-l-2 border-marca pl-3 text-sm leading-relaxed text-destaque italic">
              {p.frase.map((t, i) => (t.negrito ? <strong key={i} className="font-semibold">{t.texto}</strong> : <span key={i}>{t.texto}</span>))}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {p.tutorias.map((t) => (
              <details key={t.id} className="group rounded-xl bg-marca-suave/60">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <ChevronRight aria-hidden size={15} className="shrink-0 text-texto-suave transition-transform group-open:rotate-90" />
                  <IconeDoModelo icone={t.icone} tamanho={15} />
                  {t.nome}
                </summary>
                <div className="px-4 pb-4">
                  <div className="rounded-xl border border-borda bg-superficie p-4">
                    <ArvoreDeMateriais materiais={t.materiais} mentoradaId={mentoradaId} progresso={progresso} admin={admin} paraMentorada={paraMentorada} />
                  </div>
                </div>
              </details>
            ))}
          </div>

          {sessoes ? (
            <div className="mt-4">
              <SessoesDoPilar
                mentoradaId={mentoradaId}
                sessoes={sessoes[p.id] ?? []}
                opcoes={opcoesDasSessoes}
                podeEditar={podeEditarSessoes}
              />
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
