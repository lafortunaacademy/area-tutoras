export function BarraVerComo({ nome }: { nome: string }) {
  return (
    <div className="bg-destaque/15 border-b border-destaque/30">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-2 text-sm">
        <p>
          Você está vendo a área como <strong className="font-medium">{nome}</strong>.
        </p>
        <form action="/admin/parar-preview" method="post">
          <button type="submit" className="font-medium underline underline-offset-2">
            Sair do preview
          </button>
        </form>
      </div>
    </div>
  );
}
