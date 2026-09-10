import Link from 'next/link';
import { Eye } from 'lucide-react';
import { exigirAdmin, type Tutora } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verComo } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const sessao = await exigirAdmin();

  const { data: tutoras } = await supabaseAdmin()
    .from('tutoras')
    .select('*')
    .order('nome')
    .returns<Tutora[]>();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="display text-2xl">Tutoras</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Veja a área exatamente como cada tutora vê, sem logar como ela.
          </p>
        </div>
        <Link href="/painel" className="text-sm text-texto-suave transition hover:text-marca">
          Voltar ao painel
        </Link>
      </div>

      <ul className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie">
        {(tutoras ?? []).map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {t.nome}
                {t.is_admin ? (
                  <span className="ml-2 rounded-full bg-marca-suave px-2 py-0.5 text-[11px] font-normal text-marca">
                    admin
                  </span>
                ) : null}
                {!t.ativa ? (
                  <span className="ml-2 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-normal text-texto-suave">
                    inativa
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-texto-suave">{t.email}</p>
            </div>

            {t.id === sessao.real.id ? (
              <span className="shrink-0 text-xs text-texto-suave">você</span>
            ) : (
              <form action={verComo}>
                <input type="hidden" name="tutoraId" value={t.id} />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-xs font-medium transition hover:border-marca hover:text-marca"
                >
                  <Eye aria-hidden size={14} />
                  Ver como
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
