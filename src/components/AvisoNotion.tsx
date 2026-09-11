/**
 * Erro de carregamento.
 *
 * A tutora vê só que não deu certo — o detalhe técnico não a ajuda e cita
 * ferramenta que ela não precisa conhecer. Para quem administra, o motivo
 * aparece, porque é quem vai consertar.
 */
export function AvisoNotion({ erro, detalhar = false }: { erro: unknown; detalhar?: boolean }) {
  const mensagem = erro instanceof Error ? erro.message : String(erro);

  return (
    <div className="rounded-xl border border-parado/30 bg-parado-suave p-5">
      <p className="text-sm font-medium text-parado">Não consegui carregar estes dados agora.</p>
      <p className="mt-2 text-sm text-texto-suave">
        {detalhar ? mensagem : 'Recarregue a página em instantes. Se continuar, me avise.'}
      </p>
    </div>
  );
}
