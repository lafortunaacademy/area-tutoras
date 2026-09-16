export type Coluna = { nome: string; numero?: boolean; destaque?: boolean };

/**
 * Tabela financeira: cabeçalho em texto simples, números alinhados à direita e
 * em algarismos tabulares, nada cortado. Quando não cabe, a tabela rola de lado
 * em vez de espremer as colunas até esconder os valores.
 */
export function TabelaFinanceira({
  colunas,
  linhas,
  rodape,
}: {
  colunas: Coluna[];
  linhas: { id: string; celulas: React.ReactNode[] }[];
  rodape?: React.ReactNode[];
}) {
  const alinhamento = (c?: Coluna) =>
    `${c?.numero ? 'text-right tabular-nums' : 'text-left'} ${c?.destaque ? 'bg-fundo/60' : ''}`;

  return (
    <div className="overflow-x-auto rounded-xl border border-borda">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-borda">
            {colunas.map((c) => (
              <th
                key={c.nome}
                className={`px-3 py-2.5 text-[11px] font-medium whitespace-nowrap text-texto-suave ${alinhamento(c)}`}
              >
                {c.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-borda/60 last:border-0 hover:bg-fundo/70">
              {l.celulas.map((valor, i) => (
                <td key={i} className={`px-3 py-2 whitespace-nowrap ${alinhamento(colunas[i])}`}>
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape ? (
          <tfoot>
            <tr className="border-t border-borda bg-fundo">
              {rodape.map((valor, i) => (
                <td
                  key={i}
                  className={`px-3 py-2.5 text-[12px] font-medium whitespace-nowrap ${alinhamento(colunas[i])}`}
                >
                  {valor}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
