import Link from 'next/link';

/**
 * Botões de ano. O ano escolhido vai no endereço (?ano=2025), então o servidor
 * já desenha a página certa e o link pode ser compartilhado. Com um ano só, não
 * aparece nada.
 */
export function SeletorDeAno({ anos, selecionado, caminho }: { anos: string[]; selecionado: string; caminho: string }) {
  if (anos.length < 2) return null;

  return (
    <nav aria-label="Ano" className="flex flex-wrap items-center gap-1">
      {anos.map((ano) => (
        <Link
          key={ano}
          href={`${caminho}?ano=${ano}`}
          scroll={false}
          aria-current={ano === selecionado ? 'page' : undefined}
          className={`rounded-lg px-3.5 py-1.5 text-sm tabular-nums transition ${
            ano === selecionado
              ? 'bg-marca font-medium text-marca-contraste'
              : 'border border-borda bg-superficie text-texto-suave hover:border-marca hover:text-texto'
          }`}
        >
          {ano}
        </Link>
      ))}
    </nav>
  );
}
