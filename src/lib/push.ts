import 'server-only';
import { createSign, sign as assinarEs256 } from 'node:crypto';
import { connect } from 'node:http2';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizarId } from '@/lib/notion/carteira';
import { getSessao } from '@/lib/session';

/**
 * Notificações no celular das mentoradas (app la-fortuna-app).
 *
 * Sem SDK: o iPhone recebe direto do APNs (chave .p8 da conta Apple) e o
 * Android do Firebase Cloud Messaging (conta de serviço do Firebase). Sem as
 * variáveis de um dos dois, aquela plataforma só não recebe — nada quebra.
 *
 *   APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY (conteúdo do .p8), APNS_BUNDLE_ID,
 *   APNS_AMBIENTE=desenvolvimento só para build rodando pelo Xcode;
 *   FCM_CONTA_DE_SERVICO (o JSON inteiro da conta de serviço).
 */

export type Notificacao = {
  titulo: string;
  corpo: string;
  /** Caminho aberto ao tocar na notificação ("/mentoradas/<id>#tarefas"). */
  url?: string;
};

/** Token do celular em que a mentorada está logada; o logout o usa para desligar as notificações. */
export const COOKIE_DO_CELULAR = 'celular';

type Dispositivo = { token: string; plataforma: 'ios' | 'android' };

/** Manda para todos os celulares de uma mentorada. Devolve quantos receberam. */
export async function notificarMentorada(mentoradaId: string, n: Notificacao): Promise<number> {
  const { data } = await supabaseAdmin()
    .from('dispositivos')
    .select('token, plataforma')
    .eq('mentorada_id', normalizarId(mentoradaId))
    .returns<Dispositivo[]>();
  return enviar(data ?? [], n);
}

/**
 * Avisa a mentorada de algo que a equipe fez na área dela (tarefa nova,
 * registro de tutoria). Quando foi ela mesma, não há o que avisar.
 */
export async function avisarSeFoiAEquipe(mentoradaId: string, n: Notificacao): Promise<void> {
  const sessao = await getSessao();
  if (!sessao || sessao.verComo) return;
  await notificarMentorada(mentoradaId, n).catch((e) => console.error('[push] aviso falhou:', e));
}

/** Manda para todas as mentoradas com o app instalado e o acesso ativo. */
export async function notificarTodas(n: Notificacao): Promise<number> {
  const db = supabaseAdmin();
  const [{ data: dispositivos }, { data: ativas }] = await Promise.all([
    db.from('dispositivos').select('token, plataforma, mentorada_id').returns<(Dispositivo & { mentorada_id: string })[]>(),
    db.from('mentoradas_acesso').select('notion_page_id').eq('ativa', true),
  ]);
  const comAcesso = new Set((ativas ?? []).map((a) => normalizarId(String(a.notion_page_id))));
  return enviar((dispositivos ?? []).filter((d) => comAcesso.has(d.mentorada_id)), n);
}

/** As mentoradas que têm o app instalado (para os lembretes não varrerem todas). */
export async function mentoradasComCelular(): Promise<string[]> {
  const { data } = await supabaseAdmin().from('dispositivos').select('mentorada_id');
  return [...new Set((data ?? []).map((d) => String(d.mentorada_id)))];
}

/**
 * true na primeira vez que a chave aparece, false nas seguintes. É o que
 * impede o mesmo lembrete de sair duas vezes.
 */
export async function primeiraVez(chave: string): Promise<boolean> {
  const { error } = await supabaseAdmin().from('push_enviados').insert({ chave });
  return !error;
}

async function enviar(dispositivos: Dispositivo[], n: Notificacao): Promise<number> {
  const resultados = await Promise.all(
    dispositivos.map(async (d) => {
      try {
        const r = d.plataforma === 'ios' ? await enviarApns(d.token, n) : await enviarFcm(d.token, n);
        // Token morto (app desinstalado): sai da lista para não insistir.
        if (r === 'invalido') await supabaseAdmin().from('dispositivos').delete().eq('token', d.token);
        return r === 'ok';
      } catch (e) {
        console.error(`[push] ${d.plataforma} falhou:`, e instanceof Error ? e.message : e);
        return false;
      }
    }),
  );
  return resultados.filter(Boolean).length;
}

type Resultado = 'ok' | 'invalido' | 'erro' | 'sem-config';

// --- iPhone: APNs ---------------------------------------------------------

let jwtApns: { valor: string; criadoEm: number } | null = null;

function tokenApns(): string | null {
  const { APNS_KEY_ID: kid, APNS_TEAM_ID: equipe, APNS_KEY: chave } = process.env;
  if (!kid || !equipe || !chave) return null;
  // A Apple recusa token com mais de 1 h e também token renovado a cada envio.
  if (jwtApns && Date.now() - jwtApns.criadoEm < 50 * 60 * 1000) return jwtApns.valor;

  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corpo = `${b64({ alg: 'ES256', kid })}.${b64({ iss: equipe, iat: Math.floor(Date.now() / 1000) })}`;
  const assinatura = assinarEs256('sha256', Buffer.from(corpo), {
    key: chave.replace(/\\n/g, '\n'),
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  jwtApns = { valor: `${corpo}.${assinatura}`, criadoEm: Date.now() };
  return jwtApns.valor;
}

function enviarApns(token: string, n: Notificacao): Promise<Resultado> {
  const jwt = tokenApns();
  if (!jwt) return Promise.resolve('sem-config');
  const host =
    process.env.APNS_AMBIENTE === 'desenvolvimento' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const payload = JSON.stringify({
    aps: { alert: { title: n.titulo, body: n.corpo }, sound: 'default' },
    url: n.url,
  });

  return new Promise((resolve, reject) => {
    const cliente = connect(host);
    cliente.on('error', reject);
    const pedido = cliente.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': process.env.APNS_BUNDLE_ID ?? 'com.lafortunaacademy.app',
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    });
    let status = 0;
    let resposta = '';
    pedido.on('response', (h) => (status = Number(h[':status'])));
    pedido.on('data', (c) => (resposta += c));
    pedido.on('end', () => {
      cliente.close();
      if (status === 200) return resolve('ok');
      if (status === 410 || /BadDeviceToken|Unregistered/.test(resposta)) return resolve('invalido');
      console.error('[push] APNs', status, resposta);
      resolve('erro');
    });
    pedido.on('error', (e) => {
      cliente.close();
      reject(e);
    });
    pedido.end(payload);
  });
}

// --- Android: Firebase Cloud Messaging ------------------------------------

type ContaDeServico = { project_id: string; client_email: string; private_key: string; token_uri?: string };
let acessoFcm: { valor: string; expira: number } | null = null;

function contaFcm(): ContaDeServico | null {
  const bruto = process.env.FCM_CONTA_DE_SERVICO;
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as ContaDeServico;
  } catch {
    console.error('[push] FCM_CONTA_DE_SERVICO não é um JSON válido');
    return null;
  }
}

async function tokenFcm(conta: ContaDeServico): Promise<string> {
  if (acessoFcm && Date.now() < acessoFcm.expira) return acessoFcm.valor;

  const aud = conta.token_uri ?? 'https://oauth2.googleapis.com/token';
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: conta.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud,
    iat: agora,
    exp: agora + 3600,
  })}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(conta.private_key, 'base64url');

  const r = await fetch(aud, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${corpo}.${assinatura}`,
    }),
  });
  if (!r.ok) throw new Error(`token do Google: ${r.status} ${await r.text()}`);
  const { access_token, expires_in } = (await r.json()) as { access_token: string; expires_in: number };
  acessoFcm = { valor: access_token, expira: Date.now() + (expires_in - 300) * 1000 };
  return access_token;
}

async function enviarFcm(token: string, n: Notificacao): Promise<Resultado> {
  const conta = contaFcm();
  if (!conta) return 'sem-config';

  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await tokenFcm(conta)}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: n.titulo, body: n.corpo },
        data: n.url ? { url: n.url } : {},
        android: { priority: 'high' },
      },
    }),
  });
  if (r.ok) return 'ok';
  const resposta = await r.text();
  if (r.status === 404 || /UNREGISTERED|registration-token-not-registered/.test(resposta)) return 'invalido';
  console.error('[push] FCM', r.status, resposta);
  return 'erro';
}
