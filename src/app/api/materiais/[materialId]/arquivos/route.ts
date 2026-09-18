import { NextResponse, type NextRequest } from 'next/server';
import { temAcesso } from '@/lib/acesso';
import { normalizarId } from '@/lib/notion/carteira';
import { anexarNaPreSessao } from '@/lib/notion/pilares';

/**
 * Anexa um arquivo numa pergunta da pré-sessão, direto no Notion.
 * Na Vercel o corpo do pedido vai até ~4,5 MB, então o limite fica em 4 MB.
 */
const LIMITE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {

  const form = await request.formData().catch(() => null);
  const mentorada = form?.get('mentorada');
  const callout = form?.get('bloco');
  const arquivo = form?.get('arquivo');
  const token = form?.get('token');
  if (typeof mentorada !== 'string' || typeof callout !== 'string' || !(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  }
  const { materialId } = await params;
  if (!(await temAcesso(typeof token === 'string' ? token : undefined, mentorada, materialId))) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json({ erro: 'arquivo maior que 4 MB' }, { status: 413 });
  }

  try {
    const bloco = await anexarNaPreSessao(normalizarId(mentorada), normalizarId(materialId), normalizarId(callout), arquivo);
    if (!bloco) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    return NextResponse.json({ bloco });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
