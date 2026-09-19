'use server';

import { revalidatePath } from 'next/cache';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { marcarTarefa } from '@/lib/notion/tarefas';
import { atualizarValorDoMes, CAMPOS_EDITAVEIS_DO_MES, type CampoEditavelDoMes } from '@/lib/notion/gestao';

export async function alternarTarefa(form: FormData): Promise<void> {
  const mentoradaId = String(form.get('mentoradaId') ?? '');
  await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);
  const tarefaId = String(form.get('tarefaId') ?? '');
  if (!tarefaId) return;

  // Se falhar (tarefa apagada no Notion no meio do caminho, Notion fora do ar),
  // a lista só é recarregada: ela mostra o estado real, sem derrubar a página.
  await marcarTarefa(mentorada.id, tarefaId, form.get('feita') === 'true').catch(() => false);
  revalidatePath(`/mentoradas/${mentorada.id}`);
}

export type ResultadoValor = { ok: true } | { ok: false; erro: string };

/** Um número da visão mensal financeira (faturamento, despesas…), gravado no mês dela no Notion. */
export async function salvarValorDoMes(
  mentoradaId: string,
  mesId: string,
  campo: CampoEditavelDoMes,
  valor: number | null,
): Promise<ResultadoValor> {
  await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  if (!CAMPOS_EDITAVEIS_DO_MES.includes(campo)) return { ok: false, erro: 'Campo não editável.' };
  if (valor !== null && (!Number.isFinite(valor) || Math.abs(valor) > 1e12)) {
    return { ok: false, erro: 'Valor inválido.' };
  }

  try {
    const ok = await atualizarValorDoMes(mentorada.id, mesId, campo, valor);
    if (!ok) return { ok: false, erro: 'Esse mês não é desta mentorada.' };
  } catch {
    return { ok: false, erro: 'Não foi possível salvar agora.' };
  }

  revalidatePath(`/mentoradas/${mentorada.id}/gestao-de-resultados`);
  revalidatePath(`/mentoradas/${mentorada.id}`);
  return { ok: true };
}
