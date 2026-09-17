import { NextResponse, type NextRequest } from 'next/server';
import { getVisitante } from '@/lib/session';
import { podeVer } from '@/lib/acesso';
import { normalizarId } from '@/lib/notion/carteira';
import { lerCenario } from '@/lib/notion/cenarios';

/**
 * Conteúdo de um cartão de cenário, sob demanda — só quando o cartão é aberto.
 * GET e não Server Action, pelo mesmo motivo do `notion-content`: leitura não
 * deve re-renderizar a rota inteira.
 *
 * A área das mentoradas é de quem entrou: o administrativo ou a própria mentorada. A mentorada e o
 * cartão são conferidos aqui de novo, porque os dois IDs vêm do navegador.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ cenarioId: string }> }) {
  const visitante = await getVisitante();
  if (!visitante) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId || !podeVer(visitante, mentoradaId)) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
  }

  const { cenarioId } = await params;
  try {
    // Não refaz a lista de mentoradas (custa uma consulta inteira ao Notion): o
    // cartão só é lido se morar na base de cenários encontrada na página DESTA
    // mentorada — outro ID qualquer cai no 404.
    const cenario = await lerCenario(normalizarId(mentoradaId), normalizarId(cenarioId));
    if (!cenario) return NextResponse.json({ erro: 'não encontrada' }, { status: 404 });

    return NextResponse.json(cenario);
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
