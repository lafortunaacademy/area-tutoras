import type { ItemMapa } from '@/lib/notion/mentorada';

/**
 * O mapa é o retrato da mentorada: quem ela é, o que faz, para quem.
 *
 * Retrato à esquerda, dados à direita. Do lado direito os campos se separam em
 * dois ritmos: os curtos (idade, faturamento, tempo de atuação) em duas colunas,
 * porque são de bater o olho; os de texto corrido em largura cheia, porque em
 * meia coluna viram um paredão de três palavras por linha.
 */
export function MapaDaCliente({
  item,
  nome,
  foto,
}: {
  item: ItemMapa;
  /** Nome da mentorada. O título da linha do mapa não serve: é preenchido por
      ela e costuma vir com qualquer coisa. */
  nome: string;
  /** A foto vem de fora: mora na área individual, não na base do mapa. */
  foto: string | null;
}) {
  const curtos = item.campos.filter((c) => !c.longo);
  const longos = item.campos.filter((c) => c.longo);

  return (
    <div className="overflow-hidden rounded-xl border border-borda bg-superficie">
      <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr] sm:gap-8 xl:grid-cols-[220px_1fr]">
        <div>
          <Retrato nome={nome} foto={item.foto ?? foto} />
        </div>

        <div className="min-w-0">
          {curtos.length > 0 ? (
            <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {curtos.map((c) => (
                <Campo key={c.nome} nome={c.nome} valor={c.valor} />
              ))}
            </dl>
          ) : null}

          {longos.length > 0 ? (
            <dl
              className={`grid gap-x-10 gap-y-4 xl:grid-cols-2 ${curtos.length > 0 ? 'mt-6 border-t border-borda pt-6' : ''}`}
            >
              {longos.map((c) => (
                <Campo key={c.nome} nome={c.nome} valor={c.valor} />
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Campo({ nome, valor }: { nome: string; valor: string }) {
  return (
    <div>
      <dt className="rotulo text-[10px] text-destaque">{nome}</dt>
      <dd className="mt-1 text-sm leading-relaxed whitespace-pre-line">{conteudo(nome, valor)}</dd>
    </div>
  );
}

/** Instagram vira link; o resto é texto. */
function conteudo(nome: string, valor: string): React.ReactNode {
  if (!/instagram/i.test(nome)) return valor;

  const arroba = valor.trim().replace(/^@/, '');
  if (!arroba || /\s/.test(arroba)) return valor;

  return (
    <a
      href={`https://instagram.com/${encodeURIComponent(arroba)}`}
      target="_blank"
      rel="noreferrer"
      className="text-marca underline underline-offset-2"
    >
      @{arroba}
    </a>
  );
}

/**
 * Sem foto na base, o monograma segura o lugar — e mantém o desenho de pé em
 * vez de deixar um buraco cinza onde deveria ter um rosto.
 */
function Retrato({ nome, foto }: { nome: string; foto: string | null }) {
  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={nome}
        className="aspect-[3/4] w-full rounded-xl border border-borda object-cover"
      />
    );
  }

  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div
      aria-hidden
      className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-marca-suave"
    >
      <span className="display text-3xl text-marca">{iniciais}</span>
    </div>
  );
}
