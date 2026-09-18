import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { enviarRascunho } from '@/lib/tutorias/respostas';

/** Envia o rascunho de um formulário: vira a última resposta, e o próximo começa em branco. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as { mentorada?: string; materialId?: string; token?: string } | null;
  if (!corpo?.mentorada || !corpo.materialId) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  const permissao = await permissaoNasTutorias(corpo.mentorada, { token: corpo.token, materialId: corpo.materialId });
  if (!permissao?.podeEditar || (permissao.soMaterial && permissao.soMaterial !== corpo.materialId)) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  try {
    const enviado = await enviarRascunho(corpo.mentorada, corpo.materialId);
    if (!enviado) return NextResponse.json({ erro: 'nada para enviar' }, { status: 400 });
    return NextResponse.json({ envio: enviado });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
