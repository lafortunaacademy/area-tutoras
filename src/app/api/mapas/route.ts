import { NextResponse, type NextRequest } from 'next/server';
import { getSessao } from '@/lib/session';
import { ligarRespostaNaMentorada, ligarRespostasDoMapa } from '@/lib/notion/mapas';
import { liberarAcessosDoCadastro } from '@/lib/notion/clientes';

/**
 * Duas pontes com o Notion: libera no app o acesso de quem já tem e-mail e área
 * no cadastro ("CRM clientes") e liga as respostas do formulário "Mapa da
 * cliente" à área de cada uma. Roda sozinha (a cada visita do administrativo e pelo agendamento da
 * hospedagem) e também à mão, quando o administrativo escolhe a mentorada.
 *
 * Sem sessão de administrativo, só passa com o segredo do agendamento.
 */
export async function POST(request: NextRequest) {
  const sessao = await getSessao();
  const admin = Boolean(sessao?.real.is_admin);
  const segredo = process.env.CRON_SECRET;
  const autorizado = admin || (segredo && request.headers.get('authorization') === `Bearer ${segredo}`);
  if (!autorizado) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });

  const corpo = (await request.json().catch(() => null)) as
    | { resposta?: string; mentorada?: string; acessos?: boolean }
    | null;

  try {
    if (corpo?.resposta && corpo?.mentorada) {
      if (!admin) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
      const ok = await ligarRespostaNaMentorada(corpo.resposta, corpo.mentorada);
      return ok ? NextResponse.json({ ok }) : NextResponse.json({ erro: 'não encontrada' }, { status: 404 });
    }

    // Liberar acesso é um pedido à parte: dá entrada no app para a cliente, e
    // isso só acontece quando o administrativo pede.
    if (corpo?.acessos) {
      if (!admin) return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
      return NextResponse.json({ acessos: await liberarAcessosDoCadastro() });
    }

    const resultado = await ligarRespostasDoMapa();
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
