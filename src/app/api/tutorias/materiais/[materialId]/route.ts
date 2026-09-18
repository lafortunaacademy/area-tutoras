import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { formulario } from '@/lib/tutorias/modelo';
import { estadoDoFormulario } from '@/lib/tutorias/respostas';

/** Um formulário das tutorias com o rascunho, o último envio e o histórico da mentorada. */
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
    const estado = await estadoDoFormulario(mentoradaId, materialId);
    return NextResponse.json({ material, estado, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
