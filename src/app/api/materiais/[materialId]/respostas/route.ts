import { NextResponse, type NextRequest } from 'next/server';
import { getSessao } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { responderPreSessao, type RespostaDaPreSessao } from '@/lib/notion/pilares';

/**
 * Grava uma resposta da pré-sessão no Notion (marcar opção, escrever resposta).
 * Por enquanto só o administrativo entra na área das mentoradas.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const sessao = await getSessao();
  if (!sessao?.real.is_admin) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const corpo = (await request.json().catch(() => null)) as
    | ({ mentorada?: string } & Partial<{ acao: string; blocoId: string; marcado: boolean; texto: string }>)
    | null;
  const resposta = validar(corpo);
  if (!corpo?.mentorada || !resposta) {
    return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  }

  const { materialId } = await params;
  try {
    const id = await responderPreSessao(normalizarId(corpo.mentorada), normalizarId(materialId), resposta);
    if (!id) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

function validar(c: Partial<{ acao: string; blocoId: string; marcado: boolean; texto: string }> | null): RespostaDaPreSessao | null {
  if (!c || typeof c.blocoId !== 'string' || !c.blocoId) return null;
  const blocoId = normalizarId(c.blocoId);
  if (c.acao === 'marcar' && typeof c.marcado === 'boolean') return { acao: 'marcar', blocoId, marcado: c.marcado };
  if ((c.acao === 'texto' || c.acao === 'adicionar') && typeof c.texto === 'string' && c.texto.length <= 20_000) {
    return { acao: c.acao, blocoId, texto: c.texto };
  }
  return null;
}
