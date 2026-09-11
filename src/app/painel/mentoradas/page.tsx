import Link from 'next/link';
import { exigirSessao } from '@/lib/session';
import { carteiraDaTutora } from '@/lib/notion/carteira';
import { AvisoNotion } from '@/components/AvisoNotion';
import { Etiqueta } from '@/components/Etiqueta';

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
        <h1 className="display text-2xl">Mentoradas</h1>
        <p className="mt-1 text-sm text-texto-suave">
          {mentoradas.length === 0
            ? 'Nenhuma mentorada ativa no Notion.'
            : `${mentoradas.length} ativa${mentoradas.length > 1 ? 's' : ''} — direto do Notion, sempre atualizado.`}
        </p>
      </div>

      {mentoradas.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-borda text-left">
                <th className="rotulo px-5 py-3 text-[10px] font-normal text-texto-suave">
                  Cliente
                </th>
                <th className="rotulo px-5 py-3 text-[10px] font-normal text-texto-suave">
                  Mentoria
                </th>
                <th className="rotulo px-5 py-3 text-[10px] font-normal text-texto-suave">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {mentoradas.map((m) => (
                <tr key={m.id} className="border-b border-borda last:border-0 hover:bg-fundo">
                  <td className="px-5 py-3">
                    {/* O link cobre só o nome, mas é o alvo grande da linha: um
                        <tr> clicável quebraria teclado e "abrir em nova aba". */}
                    <Link
                      href={`/painel/${m.id}`}
                      className="font-medium transition hover:text-marca"
                    >
                      {m.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-texto-suave">{m.mentoria}</td>
                  <td className="px-5 py-3">
                    <Etiqueta texto={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
