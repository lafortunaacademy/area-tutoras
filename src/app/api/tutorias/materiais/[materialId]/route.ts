import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { formulario } from '@/lib/tutorias/modelo';
import { estadoDoFormulario } from '@/lib/tutorias/respostas';
import { areaDoMaterial } from '@/lib/tutorias/sessoes';

/** Um formulário das tutorias com o rascunho, o último envio e o histórico da mentorada. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });

  try {
    const material = await formulario(materialId);
    if (!material) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    const permissao = await permissaoNasTutorias(mentoradaId, material.quemPreenche);
    if (!permissao) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
    const [estado, area] = await Promise.all([estadoDoFormulario(mentoradaId, materialId), areaDoMaterial(materialId)]);
    return NextResponse.json({ material, area, estado, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
