import { SemDados } from './Bloco';
import { MESES } from './eixos';

export type MarcoNaLinha = { id: string; titulo: string; data: string | null };

/**
 * Os doze meses do ano corrente, com o dia de hoje marcado e cada marco na data
 * em que aconteceu.
 *
 * Os marcos se revezam em três alturas: dois no mesmo mês ficariam um em cima
 * do outro na mesma linha.
 */
export function LinhaDoTempo({ marcos = [] }: { marcos?: MarcoNaLinha[] }) {
  const agora = new Date();
  const ano = agora.getFullYear();
  const inicio = new Date(ano, 0, 1).getTime();
  const fim = new Date(ano + 1, 0, 1).getTime();
  const posicao = (t: number) => ((t - inicio) / (fim - inicio)) * 100;
  const hoje = posicao(agora.getTime());
  const mesAtual = agora.getMonth();

  const doAno = marcos.filter((m) => m.data?.startsWith(String(ano)));
  const deOutrosAnos = marcos.length - doAno.length;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-12 border-b border-borda">
            {MESES.map((m, i) => (
              <span
                key={m}
                className={`px-2 pb-2 text-[11px] ${i === mesAtual ? 'font-medium text-marca' : 'text-texto-suave'}`}
              >
                {m}
                {i === 0 ? <span className="ml-1 text-destaque">{ano}</span> : null}
              </span>
            ))}
          </div>

          <div className="relative grid h-32 grid-cols-12">
            {MESES.map((m, i) => (
              <div
                key={m}
                className={`border-r border-borda/45 last:border-r-0 ${i === mesAtual ? 'bg-marca-suave/50' : ''}`}
              />
            ))}

            <div aria-hidden className="absolute top-0 bottom-0 w-px bg-marca" style={{ left: `${hoje}%` }}>
              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-marca" />
            </div>

            {doAno.map((m, i) => {
              const [a, mes, d] = m.data!.slice(0, 10).split('-').map(Number);
              const x = posicao(new Date(a, mes - 1, d).getTime());
              // Perto da borda direita o rótulo cresce para a esquerda, senão sai do quadro.
              const paraEsquerda = x > 75;
              return (
                <div
                  key={m.id}
                  className="absolute flex max-w-[12rem] items-center gap-1.5 rounded-full border border-borda bg-superficie py-0.5 pr-2.5 pl-1.5 text-[11px] shadow-[var(--sombra)]"
                  style={{
                    left: `${x}%`,
                    top: `${12 + (i % 3) * 36}px`,
                    transform: paraEsquerda ? 'translateX(calc(-100% + 8px))' : 'translateX(-8px)',
                  }}
                  title={`${m.titulo} · ${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${a}`}
                >
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-marca" />
                  <span className="truncate">{m.titulo}</span>
                </div>
              );
            })}

            {doAno.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <SemDados>Nenhum marco registrado em {ano}</SemDados>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {deOutrosAnos > 0 ? (
        <p className="mt-2 text-xs text-texto-suave">
          + {deOutrosAnos} {deOutrosAnos === 1 ? 'marco' : 'marcos'} em outros anos
        </p>
      ) : null}
    </div>
  );
}
