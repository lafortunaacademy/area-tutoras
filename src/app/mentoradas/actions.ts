'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirAcessoAMentorada } from '@/lib/session';
import { exigirMentoradaDoModeloNovo } from '@/lib/notion/guard';
import { criarTarefa, marcarTarefa } from '@/lib/notion/tarefas';
import { atualizarValorDoMes, CAMPOS_EDITAVEIS_DO_MES, type CampoEditavelDoMes } from '@/lib/notion/gestao';

export type EstadoTarefa = { erro?: string };

/**
 * Tudo que chega aqui veio do navegador: a mentorada e a tarefa são conferidas
 * de novo no servidor antes de qualquer escrita.
 */
export async function adicionarTarefa(_anterior: EstadoTarefa, form: FormData): Promise<EstadoTarefa> {
  const mentoradaId = String(form.get('mentoradaId') ?? '');
  await exigirAcessoAMentorada(mentoradaId);
  const mentorada = await exigirMentoradaDoModeloNovo(mentoradaId);

  const tarefa = String(form.get('tarefa') ?? '').trim();
  const prazo = String(form.get('prazo') ?? '').trim();
  const observacoes = String(form.get('observacoes') ?? '').trim();

  if (!tarefa) return { erro: 'Escreva a tarefa.' };
  // O Notion recusa texto acima de 2.000 caracteres por bloco.
  if (tarefa.length > 1900) return { erro: 'O nome da tarefa está longo demais.' };
  if (observacoes.length > 10000) return { erro: 'As observações estão longas demais.' };
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { erro: 'Prazo inválido.' };

  try {
    const ok = await criarTarefa(mentorada.id, { tarefa, prazo: prazo || null, observacoes });
    if (!ok) return { erro: 'Não encontrei a lista de tarefas desta mentorada.' };
  } catch {
    return { erro: 'Não foi possível salvar agora. Tente de novo.' };
  }

  revalidatePath(`/mentoradas/${mentorada.id}`);
  // Fora do try: o redirect do Next funciona lançando uma exceção.
  redirect(`/mentoradas/${mentorada.id}#tarefas`);
}

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
