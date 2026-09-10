import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Client com service-role key: ignora RLS.
 *
 * Só é usado onde o próprio código já provou quem é o usuário — nunca a partir
 * de algo vindo do browser. Esta key jamais é exposta ao cliente.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
