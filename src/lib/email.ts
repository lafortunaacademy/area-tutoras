import 'server-only';

/**
 * Envio de e-mail pelo Resend.
 *
 * Fica desligado enquanto `RESEND_API_KEY` não existir: o app segue funcionando
 * e só não avisa ninguém. Assim dá para subir o aviso antes de a conta de envio
 * estar pronta, sem quebrar nada.
 */

export type Email = { para: string[]; assunto: string; texto: string };

export function envioConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

/** `true` quando saiu; `false` quando não está configurado ou o envio falhou. */
export async function enviarEmail({ para, assunto, texto }: Email): Promise<boolean> {
  if (!envioConfigurado() || para.length === 0) return false;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_REMETENTE,
      to: para,
      subject: assunto,
      text: texto,
    }),
  }).catch(() => null);

  return Boolean(r?.ok);
}

/** Quem recebe os avisos do sistema, de `EMAIL_AVISOS` (separados por vírgula). */
export function destinatariosDosAvisos(): string[] {
  return (process.env.EMAIL_AVISOS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}
