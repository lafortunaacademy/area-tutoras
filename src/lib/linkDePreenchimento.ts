import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Link de preenchimento de uma pré-sessão: abre só aquele formulário, sem
 * login. Quem tem o link preenche, então ele vale por tempo limitado e não dá
 * acesso a mais nada da mentorada.
 *
 * O token carrega mentorada, material e validade, assinados com a mesma chave
 * do "ver como" (`PREVIEW_COOKIE_SECRET`).
 */

const DIAS_PADRAO = 90;

function segredo(): string {
  const s = process.env.PREVIEW_COOKIE_SECRET;
  if (!s) throw new Error('PREVIEW_COOKIE_SECRET não configurado.');
  return s;
}

const assinar = (valor: string) => createHmac('sha256', segredo()).update(valor).digest('base64url');

const base64url = (texto: string) => Buffer.from(texto, 'utf8').toString('base64url');

export function criarLinkDePreenchimento(mentoradaId: string, materialId: string, dias = DIAS_PADRAO): string {
  const expira = Date.now() + dias * 24 * 60 * 60 * 1000;
  const corpo = base64url(`${mentoradaId}|${materialId}|${expira}`);
  return `${corpo}.${assinar(corpo)}`;
}

export type LinkLido = { mentoradaId: string; materialId: string };

/** Devolve os IDs só se a assinatura confere e o prazo não passou. */
export function lerLinkDePreenchimento(token: string): LinkLido | null {
  const corte = token.lastIndexOf('.');
  if (corte < 1) return null;

  const corpo = token.slice(0, corte);
  const mac = token.slice(corte + 1);
  const esperado = assinar(corpo);
  if (mac.length !== esperado.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;

  const [mentoradaId, materialId, expira] = Buffer.from(corpo, 'base64url').toString('utf8').split('|');
  if (!mentoradaId || !materialId || !expira || Number(expira) < Date.now()) return null;
  return { mentoradaId, materialId };
}
