export type Coluna = { nome: string; numero?: boolean; largura?: string };

/**
 * Tabela densa no formato das visões financeiras do Notion. Números alinhados à
 * direita e em algarismos tabulares, para as colunas se compararem de olho.
 */
export function TabelaFinanceira({
  colunas,
  linhas,
  rodape,
  minimo = '48rem',
}: {
  colunas: Coluna[];
  linhas: { id: string; celulas: React.ReactNode[] }[];
  rodape?: React.ReactNode[];
  /** Largura mínima antes de a tabela rolar de lado, em vez de espremer as colunas. */
  minimo?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-borda">
      <table className="w-full table-fixed text-[13px]" style={{ minWidth: minimo }}>
        <thead>
          <tr className="border-b border-borda text-left">
            {colunas.map((c) => (
              <th
                key={c.nome}
                className={`rotulo truncate px-3 py-2.5 text-[10px] font-normal whitespace-nowrap text-texto-suave ${
                  c.numero ? 'text-right' : ''
                } ${c.largura ?? ''}`}
                title={c.nome}
              >
                {c.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-borda last:border-0 hover:bg-fundo">
              {l.celulas.map((valor, i) => (
                <td
                  key={i}
                  className={`truncate px-3 py-2 whitespace-nowrap ${
                    colunas[i]?.numero ? 'text-right text-texto-suave tabular-nums' : ''
                  }`}
                >
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape ? (
          <tfoot>
            <tr className="border-t border-borda bg-fundo/60">
              {rodape.map((valor, i) => (
                <td
                  key={i}
                  className={`px-3 py-2 text-[11px] text-texto-suave ${colunas[i]?.numero ? 'text-right tabular-nums' : ''}`}
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
