import { exigirAdmin } from '@/lib/session';
import { BarraDeAreas } from '@/components/BarraDeAreas';

/** A barra das três áreas fica por fora de tudo; o administrativo é uma delas. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();

  return (
    <div className="flex min-h-dvh">
      <BarraDeAreas />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
