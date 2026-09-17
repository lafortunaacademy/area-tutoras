import { NextResponse } from 'next/server';
import { getVisitante } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { tutoraDoHub } from '@/lib/notion/hub';

/**
 * Conteúdo de uma tutora da galeria "Tutorias do HUB", sob demanda (só quando o
 * cartão é aberto). Entram o administrativo e as mentoradas.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tutoraId: string }> }) {
  const visitante = await getVisitante();
  if (!visitante) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const { tutoraId } = await params;
  try {
    const dados = await tutoraDoHub(normalizarId(tutoraId));
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
