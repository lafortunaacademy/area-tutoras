import Link from 'next/link';
import { exigirAdmin } from '@/lib/session';
import { mentoradasDoModeloNovo } from '@/lib/notion/modelo';
import { AvisoNotion } from '@/components/AvisoNotion';
import { iniciais } from '@/lib/iniciais';

export const dynamic = 'force-dynamic';

export default async function MentoradasPage() {
  const sessao = await exigirAdmin();

  let mentoradas;
  try {
    mentoradas = await mentoradasDoModeloNovo();
  } catch (erro) {
    return <AvisoNotion erro={erro} detalhar={sessao.real.is_admin} />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="display text-3xl">Área das mentoradas</h1>
        <p className="mt-1 text-sm text-texto-suave">
          {mentoradas.length === 0
            ? 'Nenhuma mentorada está na área de membros nova ainda.'
            : 'Abra uma mentorada para ver a área de membros como ela vai ver.'}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mentoradas.map((m) => (
          <li key={m.id}>
            <Link
              href={`/mentoradas/${m.id}`}
              className="flex items-center gap-3 rounded-xl border border-borda bg-superficie px-4 py-3 transition hover:border-marca hover:shadow-[var(--sombra)]"
            >
              {m.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.foto} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-suave text-xs font-medium text-marca"
                >
                  {iniciais(m.nome)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{m.nome}</span>
                <span className="block truncate text-xs text-texto-suave">{m.mentoria}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
