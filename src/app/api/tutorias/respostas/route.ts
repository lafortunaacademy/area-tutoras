import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { pergunta } from '@/lib/tutorias/modelo';
import { salvarResposta } from '@/lib/tutorias/respostas';

/** Grava uma resposta (texto ou opções) de uma pergunta das tutorias. */
export async function POST(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as
    | { mentorada?: string; perguntaId?: string; texto?: string; opcoes?: string[]}
    | null;
  if (!corpo?.mentorada || !corpo.perguntaId) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  try {
    const p = await pergunta(corpo.perguntaId);
    if (!p) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });

    const permissao = await permissaoNasTutorias(corpo.mentorada);
    if (!permissao?.podeEditar) {
      return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
    }

    const salva = await salvarResposta(corpo.mentorada, p.id, { texto: corpo.texto, opcoes: corpo.opcoes }, permissao.quem);
    if (!salva) return NextResponse.json({ erro: 'resposta inválida' }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
