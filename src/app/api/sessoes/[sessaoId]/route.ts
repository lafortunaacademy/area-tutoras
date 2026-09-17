import { NextResponse, type NextRequest } from 'next/server';
import { getSessao } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { conteudoDaSessao } from '@/lib/notion/sessoesDaMentorada';
import { tarefasDaMentorada } from '@/lib/notion/tarefas';

/**
 * Conteúdo de uma sessão, sob demanda (só quando o cartão é aberto). Só lê: a
 * sessão precisa estar ligada a esta mentorada, e as tarefas mostradas são as
 * da própria mentorada.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sessaoId: string }> }) {
  const sessao = await getSessao();
  if (!sessao?.real.is_admin) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) {
    return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });
  }

  const { sessaoId } = await params;
  try {
    const [dados, tarefas] = await Promise.all([
      conteudoDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId)),
      tarefasDaMentorada(normalizarId(mentoradaId)).catch(() => null),
    ]);
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ ...dados, tarefas });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
