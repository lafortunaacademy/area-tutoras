import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { sessoesParaRegistro } from '@/lib/tutorias/sessoes';

/** As sessões que um registro de tutoria pode citar (para o campo "Sessão"). */
export async function GET(request: NextRequest) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const materialId = request.nextUrl.searchParams.get('material');
  if (!mentoradaId || !materialId) return NextResponse.json({ erro: 'pedido inválido' }, { status: 400 });
  if (!(await permissaoNasTutorias(mentoradaId, 'equipe'))?.podeEditar) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }
  try {
    return NextResponse.json({ sessoes: await sessoesParaRegistro(mentoradaId, materialId) });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
