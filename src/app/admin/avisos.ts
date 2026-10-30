'use server';

import { revalidatePath } from 'next/cache';
import { exigirAdmin } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { notificarMentorada, notificarTodas } from '@/lib/push';

export type EstadoAviso = { erro?: string; ok?: string };

/** Manda um aviso da La Fortuna para o celular de todas as mentoradas, ou de uma. */
export async function enviarAviso(_anterior: EstadoAviso, form: FormData): Promise<EstadoAviso> {
  const sessao = await exigirAdmin();
  const titulo = String(form.get('titulo') ?? '').trim().slice(0, 80);
  const mensagem = String(form.get('mensagem') ?? '').trim().slice(0, 300);
  const para = String(form.get('para') ?? 'todas');
  if (!titulo || !mensagem) return { erro: 'Escreva o título e a mensagem.' };

  const mentoradaId = para === 'todas' ? null : normalizarId(para);
  const aviso = { titulo, corpo: mensagem, url: mentoradaId ? `/mentoradas/${mentoradaId}` : '/' };
  const celulares = mentoradaId ? await notificarMentorada(mentoradaId, aviso) : await notificarTodas(aviso);

  await supabaseAdmin().from('avisos').insert({
    titulo,
    mensagem,
    mentorada_id: mentoradaId,
    enviado_por: sessao.real.email,
    celulares,
  });
  revalidatePath('/admin');

  if (!celulares) return { ok: 'Aviso guardado, mas nenhum celular recebeu: ninguém desse grupo tem o app com notificações ligadas.' };
  return { ok: `Aviso enviado para ${celulares} ${celulares === 1 ? 'celular' : 'celulares'}.` };
}
