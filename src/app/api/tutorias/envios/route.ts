import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { quemPreencheO } from '@/lib/tutorias/modelo';
import { enviarRascunho } from '@/lib/tutorias/respostas';

/** Envia o rascunho de um formulário: vira a última resposta, e o próximo começa em branco. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as { mentorada?: string; materialId?: string} | null;
  if (!corpo?.mentorada || !corpo.materialId) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  const quem = await quemPreencheO(corpo.materialId);
  if (!quem) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
  const permissao = await permissaoNasTutorias(corpo.mentorada, quem, corpo.materialId);
  if (!permissao?.podeEditar) {
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
