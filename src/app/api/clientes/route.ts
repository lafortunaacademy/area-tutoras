import { NextResponse, type NextRequest } from 'next/server';
import { getSessao } from '@/lib/session';
import { liberarAcessosDoCadastro } from '@/lib/notion/clientes';

/**
 * Libera no app o acesso das clientes cadastradas no Notion.
 *
 * Chamada pela automação da base "CRM clientes" (quando o cadastro é criado ou
 * o e-mail é preenchido) e também pelo administrativo. Cliente sem e-mail ou
 * sem área de membros ligada fica de fora: sem isso não dá para saber qual área
 * é dela.
 */
export async function POST(request: NextRequest) {
  const sessao = await getSessao();
  const admin = Boolean(sessao?.real.is_admin);
  const segredo = process.env.CRON_SECRET;
  const autorizado = admin || (segredo && request.headers.get('authorization') === `Bearer ${segredo}`);
  if (!autorizado) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });

  try {
    return NextResponse.json(await liberarAcessosDoCadastro());
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
