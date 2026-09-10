/** Erro de integração mostrado sem esconder o motivo — quem lê aqui é você. */
export function AvisoNotion({ erro }: { erro: unknown }) {
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  return (
    <div className="rounded-xl border border-parado/30 bg-parado-suave p-5">
      <p className="text-sm font-medium text-parado">Não consegui ler o Notion.</p>
      <p className="mt-2 text-sm text-texto-suave">{mensagem}</p>
    </div>
  );
}
