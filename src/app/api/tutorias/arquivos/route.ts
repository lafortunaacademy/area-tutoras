import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { pergunta } from '@/lib/tutorias/modelo';
import { anexarArquivo, removerArquivo } from '@/lib/tutorias/respostas';

/** Na Vercel o corpo do pedido vai até ~4,5 MB. */
const LIMITE_BYTES = 4 * 1024 * 1024;

async function autorizar(mentorada: string, perguntaId: string, token: string | null) {
  const p = await pergunta(perguntaId);
  if (!p) return null;
  const permissao = await permissaoNasTutorias(mentorada, { token, materialId: p.materialId });
  if (!permissao?.podeEditar || (permissao.soMaterial && permissao.soMaterial !== p.materialId)) return null;
  return permissao;
}

/** Anexa um arquivo numa pergunta do tipo arquivo. */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const mentorada = form?.get('mentorada');
  const perguntaId = form?.get('pergunta');
  const token = form?.get('token');
  const arquivo = form?.get('arquivo');
  if (typeof mentorada !== 'string' || typeof perguntaId !== 'string' || !(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  }
  if (arquivo.size > LIMITE_BYTES) return NextResponse.json({ erro: 'arquivo maior que 4 MB' }, { status: 413 });

  try {
    const permissao = await autorizar(mentorada, perguntaId, typeof token === 'string' ? token : null);
    if (!permissao) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
    const anexo = await anexarArquivo(mentorada, perguntaId, arquivo, permissao.quem);
    if (!anexo) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ anexo });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

/** Remove um anexo. */
export async function DELETE(request: NextRequest) {
  const corpo = (await request.json().catch(() => null)) as
    | { mentorada?: string; perguntaId?: string; caminho?: string; token?: string }
    | null;
  if (!corpo?.mentorada || !corpo.perguntaId || !corpo.caminho) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });

  try {
    const permissao = await autorizar(corpo.mentorada, corpo.perguntaId, corpo.token ?? null);
    if (!permissao) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
    const ok = await removerArquivo(corpo.mentorada, corpo.perguntaId, corpo.caminho, permissao.quem);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
