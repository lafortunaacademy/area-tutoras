import Link from 'next/link';
import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import { AvisoNotion } from '@/components/AvisoNotion';

export const dynamic = 'force-dynamic';

export default async function PainelPage() {
  const sessao = await exigirSessao();

  let mentoradas;
  try {
    mentoradas = await carteiraDaTutora(sessao.tutora.notion_tutora_page_id);
  } catch (erro) {
    return <AvisoNotion erro={erro} />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="display text-2xl">Suas mentoradas</h1>
        <p className="mt-1 text-sm text-texto-suave">
          {mentoradas.length === 0
            ? 'Nenhuma mentorada ativa ligada a você no Notion.'
            : `${mentoradas.length} ativa${mentoradas.length > 1 ? 's' : ''} — direto do Notion, sempre atualizado.`}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {mentoradas.map((m) => (
          <li key={m.id}>
            <Link
              href={`/painel/${m.id}`}
              className="block rounded-xl border border-borda bg-superficie p-5 transition hover:border-marca hover:shadow-[var(--sombra)]"
            >
              <p className="font-medium tracking-tight">{m.nome}</p>
              {m.mentoria ? (
                <p className="mt-1.5 inline-block rounded-full bg-marca-suave px-2.5 py-0.5 text-xs text-marca">
                  {m.mentoria}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
