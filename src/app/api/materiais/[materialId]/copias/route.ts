import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { normalizarId } from '@/lib/notion/carteira';
import { copiarPaginaDaTutoria } from '@/lib/notion/pilares';

/**
 * Cria uma página nova a partir do modelo — o mesmo que os botões "Nova
 * pré-sessão" e "Nova carteira de investimentos" fazem no Notion.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const corpo = (await request.json().catch(() => null)) as { mentorada?: string } | null;
  if (!corpo?.mentorada) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  if (!(await permissaoNasTutorias(corpo.mentorada, 'equipe'))?.podeEditar) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  const { materialId } = await params;
  try {
    const pagina = await copiarPaginaDaTutoria(normalizarId(corpo.mentorada), normalizarId(materialId));
    if (!pagina) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    return NextResponse.json({ pagina });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
