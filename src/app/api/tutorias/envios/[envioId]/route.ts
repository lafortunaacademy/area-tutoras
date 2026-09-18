import { NextResponse, type NextRequest } from 'next/server';
import { permissaoNasTutorias } from '@/lib/tutorias/acesso';
import { envio, respostasDoEnvio } from '@/lib/tutorias/respostas';

/** As respostas de um envio anterior (o histórico). Só leitura. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ envioId: string }> }) {
  const { envioId } = await params;
  const mentoradaId = request.nextUrl.searchParams.get('mentorada');
  if (!mentoradaId) return NextResponse.json({ erro: 'mentorada não informada' }, { status: 400 });

  try {
    const e = await envio(mentoradaId, envioId);
    if (!e) return NextResponse.json({ erro: 'não encontrado' }, { status: 404 });
    const permissao = await permissaoNasTutorias(mentoradaId);
    if (!permissao) {
      return NextResponse.json({ erro: 'não autorizada' }, { status: 403 });
    }
    return NextResponse.json({ envio: e, respostas: await respostasDoEnvio(e.id) });
  } catch {
    return NextResponse.json({ erro: 'falhou' }, { status: 502 });
  }
}
