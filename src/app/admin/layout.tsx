import { exigirAdmin } from '@/lib/session';
import { BarraDeAreas } from '@/components/BarraDeAreas';

/** A barra das três áreas fica por fora de tudo; o administrativo é uma delas. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await exigirAdmin();

  return (
    <div className="flex min-h-dvh">
      <BarraDeAreas
        nome={sessao.real.nome}
        fotoId={sessao.real.notion_tutora_page_id}
        foto={sessao.real.foto}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
