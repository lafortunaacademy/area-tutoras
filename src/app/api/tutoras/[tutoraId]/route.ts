import { NextResponse } from 'next/server';
import { getSessao } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { tutoraDoHub } from '@/lib/notion/hub';

/**
 * Conteúdo de uma tutora da galeria "Tutorias do HUB", sob demanda (só quando o
 * cartão é aberto). A área das mentoradas é só do administrativo por enquanto.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tutoraId: string }> }) {
  const sessao = await getSessao();
  if (!sessao?.real.is_admin) {
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
