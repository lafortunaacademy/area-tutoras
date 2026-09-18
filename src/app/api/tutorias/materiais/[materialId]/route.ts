import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { formulario } from '@/lib/tutorias/modelo';
import { respostasDoMaterial } from '@/lib/tutorias/respostas';

/** Um formulário das tutorias com as respostas da mentorada, sob demanda. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });

  const permissao = await permissaoNasTutorias(mentoradaId, { token: request.nextUrl.searchParams.get('token'), materialId });
  if (!permissao || (permissao.soMaterial && permissao.soMaterial !== materialId)) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  try {
    const material = await formulario(materialId);
    if (!material) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    const respostas = await respostasDoMaterial(mentoradaId, material.perguntas.map((p) => p.id));
    return NextResponse.json({ material, respostas, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
