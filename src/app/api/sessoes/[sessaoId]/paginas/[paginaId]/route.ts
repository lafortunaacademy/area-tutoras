import { NextResponse, type NextRequest } from 'next/server';
import { normalizarId } from '@/lib/notion/carteira';
import { paginaDaSessao } from '@/lib/notion/sessoesDaMentorada';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';

/**
 * Uma página de dentro de uma sessão — a pré-sessão, o teste de estilo —, lida
 * só quando alguém abre. Quem escreve nela usa o PATCH da própria sessão: o
 * bloco é conferido pelo caminho até a página da sessão.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessaoId: string; paginaId: string }> },
) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const permissao = mentoradaId ? await permissaoNasTutorias(mentoradaId, 'equipe') : null;
  if (!mentoradaId || !permissao) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  const { sessaoId, paginaId } = await params;
  try {
    const dados = await paginaDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId), normalizarId(paginaId));
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ ...dados, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
