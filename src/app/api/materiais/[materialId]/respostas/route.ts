import { NextResponse, type NextRequest } from 'next/server';
import { temAcesso } from '@/lib/acesso';
import { normalizarId } from '@/lib/notion/carteira';
import { responderPreSessao, type RespostaDaPreSessao } from '@/lib/notion/pilares';

/**
 * Grava uma resposta da pré-sessão no Notion (marcar opção, escrever resposta).
 * Entram o administrativo e a própria mentorada.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {

  const { materialId } = await params;
  const corpo = (await request.json().catch(() => null)) as
    | ({ mentorada?: string; token?: string } & Partial<{ acao: string; blocoId: string; marcado: boolean; texto: string }>)
    | null;
  const resposta = validar(corpo);
  if (!corpo?.mentorada || !resposta) {
    return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  }
  if (!(await temAcesso(corpo.token, corpo.mentorada, materialId))) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

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
