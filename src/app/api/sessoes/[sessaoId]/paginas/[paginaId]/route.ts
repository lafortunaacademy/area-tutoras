import { NextResponse, type NextRequest } from 'next/server';
import { normalizarId } from '@/lib/notion/carteira';
import { marcarOpcaoDaSessao, paginaDaSessao, placarDaPagina } from '@/lib/notion/sessoesDaMentorada';
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
    // `?so=placar`: o resultado sozinho, para atualizar depois de cada escolha.
    if (request.nextUrl.searchParams.get('so') === 'placar') {
      const placar = await placarDaPagina(normalizarId(mentoradaId), normalizarId(sessaoId), normalizarId(paginaId));
      if (!placar) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
      return NextResponse.json({ placar });
    }

    const dados = await paginaDaSessao(normalizarId(mentoradaId), normalizarId(sessaoId), normalizarId(paginaId));
    if (!dados) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    return NextResponse.json({ ...dados, podeEditar: permissao.podeEditar });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}

/**
 * Marca uma opção de resposta desta página — cada look do teste de estilo é
 * uma linha de uma base, e responder é marcar a caixa dela.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessaoId: string }> },
) {
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  const permissao = mentoradaId ? await permissaoNasTutorias(mentoradaId, 'equipe') : null;
  if (!mentoradaId || !permissao?.podeEditar) {
    return NextResponse.json({ erro: 'Sem permissão para editar.' }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as { linha?: string; marcado?: boolean } | null;
  if (!corpo?.linha || typeof corpo.marcado !== 'boolean') {
    return NextResponse.json({ erro: 'Pedido inválido.' }, { status: 400 });
  }

  const { sessaoId } = await params;
  try {
    const ok = await marcarOpcaoDaSessao(
      normalizarId(mentoradaId),
      normalizarId(sessaoId),
      normalizarId(corpo.linha),
      corpo.marcado,
    );
    if (!ok) return NextResponse.json({ erro: 'Essa opção não é desta sessão.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Não foi possível salvar agora.' }, { status: 502 });
  }
}
