import { NextResponse, type NextRequest } from 'next/server';
import { mentoradasComCelular, notificarMentorada, primeiraVez } from '@/lib/push';
import { sessoesPorCiclo } from '@/lib/notion/sessoesDaMentorada';
import type { Mentorada } from '@/lib/notion/carteira';

/**
 * Lembrete de sessão no celular, chamado pelo cron da Vercel (vercel.json)
 * uma vez por dia, de manhã: avisa das sessões de hoje e de amanhã.
 *
 * Só olha quem tem o app instalado, e cada sessão avisa uma vez por momento
 * (a trava é `push_enviados`), então rodar de novo não repete nada.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FUSO = 'America/Sao_Paulo';
const diaEm = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: FUSO });
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });

export async function GET(request: NextRequest) {
  // A Vercel manda `Authorization: Bearer <CRON_SECRET>`; sem o segredo, ninguém de fora dispara avisos.
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'não autorizada' }, { status: 401 });
  }

  const agora = new Date();
  const hoje = diaEm(agora);
  const amanha = diaEm(new Date(agora.getTime() + 24 * 60 * 60 * 1000));
  let enviados = 0;

  for (const mentoradaId of await mentoradasComCelular()) {
    // `sessoesPorCiclo` só usa a própria linha da mentorada para filtrar.
    const mentorada = { id: mentoradaId, areaDaClienteIds: [mentoradaId] } as Mentorada;
    const { sessoes } = await sessoesPorCiclo(mentorada).catch(() => ({ sessoes: [] }));

    for (const s of sessoes) {
      // "Agendar" ainda não tem data combinada; realizada ou cancelada não precisa de lembrete.
      if (!s.dataPrevista || s.realizada || /agendar|cancel|desmarc/i.test(s.status)) continue;
      const dia = s.dataPrevista.slice(0, 10);
      const quando = dia === hoje ? 'hoje' : dia === amanha ? 'amanhã' : null;
      if (!quando) continue;
      if (!(await primeiraVez(`sessao:${s.id}:${dia}:${quando}`))) continue;

      const as = s.dataPrevista.includes('T') ? ` às ${hora(s.dataPrevista)}` : '';
      const com = s.tutoras.length ? ` com ${s.tutoras.join(' e ')}` : '';
      enviados += await notificarMentorada(mentoradaId, {
        titulo: quando === 'hoje' ? 'Sua sessão é hoje' : 'Sua sessão é amanhã',
        corpo: `${s.sessao}${com}, ${quando}${as}.`,
        url: `/mentoradas/${mentoradaId}/sessoes`,
      });
    }
  }

  return NextResponse.json({ ok: true, enviados });
}
