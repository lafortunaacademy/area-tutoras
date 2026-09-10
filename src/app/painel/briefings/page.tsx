import { exigirSessao } from '@/lib/session';
import { briefingsDaTutora } from '@/lib/notion/mentorada';
import { AvisoNotion } from '@/components/AvisoNotion';

export const dynamic = 'force-dynamic';

/**
 * Briefings vivem aqui, e não dentro de uma mentorada, porque a base do Notion
 * não guarda para qual mentorada cada briefing é — só para qual tutora.
 */
export default async function BriefingsPage() {
  const sessao = await exigirSessao();

  let lista;
  try {
    lista = await briefingsDaTutora(sessao.tutora.notion_tutora_page_id);
  } catch (erro) {
    return <AvisoNotion erro={erro} />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Seus briefings</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Todos os briefings endereçados a você.
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-borda px-4 py-6 text-center text-sm text-texto-suave">
          Nenhum briefing para você ainda.
        </p>
      ) : (
        <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
          {lista.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.titulo}</p>
                {b.mentoria ? (
                  <p className="mt-0.5 text-xs text-texto-suave">{b.mentoria}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-texto-suave">{b.data}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
