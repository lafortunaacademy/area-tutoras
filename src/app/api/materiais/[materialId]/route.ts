import { NextResponse, type NextRequest } from 'next/server';
import { getVisitante } from '@/lib/session';
import { podeVer } from '@/lib/acesso';
import { normalizarId } from '@/lib/notion/carteira';
import { materialDaMentorada } from '@/lib/notion/pilares';

/**
 * Conteúdo de um material de tutoria (Pré-sessão, Carteira de investimentos…),
 * sob demanda. Só lê, e só páginas dentro da página Tutorias da mentorada.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const visitante = await getVisitante();
  if (!visitante) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId || !podeVer(visitante, mentoradaId)) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  const { materialId } = await params;
  try {
    const dados = await materialDaMentorada(normalizarId(mentoradaId), normalizarId(materialId));
    if (!dados) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
