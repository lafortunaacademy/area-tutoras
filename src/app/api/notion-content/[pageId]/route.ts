import { NextResponse, type NextRequest } from 'next/server';
import { getSessao } from '@/lib/session';
import { normalizarId } from '@/lib/notion/carteira';
import { exigirMentorada } from '@/lib/notion/guard';
import { paginaPertenceA } from '@/lib/notion/mentorada';
import { lerBlocos } from '@/lib/notion/blocks';

/**
 * Conteúdo de uma página do Notion, sob demanda.
 *
 * É uma Route Handler (GET) de propósito, e não uma Server Action: Server
 * Action chamada de Client Component faz o Next re-renderizar a rota inteira a
 * cada chamada. Ótimo para mutação, desperdício para "expandi um card, me traz
 * o conteúdo".
 *
 * A autorização é refeita aqui do zero. O browser manda dois IDs e nada mais:
 * qual mentorada e qual página. Quem é a tutora vem do cookie de sessão, a
 * carteira vem do Notion, e a página pedida só é lida se estiver na lista que o
 * próprio servidor montou.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const sessao = await getSessao();
  if (!sessao) {
    return NextResponse.json({ erro: 'não autenticada' }, { status: 401 });
  }

  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) {
    return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });
  }

  const { pageId } = await params;
  const alvo = normalizarId(pageId);

  try {
    const mentorada = await exigirMentorada(
      sessao.tutora.notion_tutora_page_id,
      mentoradaId,
    );

    if (!(await paginaPertenceA(mentorada, alvo))) {
      return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    }

    const blocos = await lerBlocos(alvo);
    return NextResponse.json({ blocos });
  } catch {
    // `exigirMentorada` chama notFound(), que vira exceção aqui.
    return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
  }
}
