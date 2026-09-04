// Núcleo compartido de envío de correo vía Zoho Mail (SMTP + Nodemailer).
// Portado verbatim del legacy. Transporter con pool, bandera de entorno, armado
// de destinatarios To/CC, y un envío genérico que NUNCA lanza (para el hook
// fire-and-forget). Los mailers por módulo (VM/LM) arman asunto/HTML/adjunto
// (o enlace) y delegan aquí.
//
// Env: ZOHO_SMTP_HOST · ZOHO_USER (también dirección `from`) · ZOHO_APP_PASSWORD
//      (contraseña de aplicación, requiere 2FA) · ZOHO_FROM_NAME (opcional).

import nodemailer, { type Transporter } from 'nodemailer';

export interface DestinatarioRow {
  Correo: string;
  Tipo: number; // 1 = To · 2 = CC
}

export interface Destinatarios {
  to: string[];
  cc: string[];
}

export interface EnvioResultado {
  ok: boolean;
  id?: string;
  error?: Error | string;
}

// true si falta cualquiera de las variables requeridas → envío deshabilitado sin
// romper la carga del módulo.
export const InvalidZohoEnv: boolean = [
  process.env.ZOHO_SMTP_HOST,
  process.env.ZOHO_USER,
  process.env.ZOHO_APP_PASSWORD,
].some(v => !v);

// Transporter reutilizable con pool. Puerto 465 SSL implícito. Los timeouts
// convierten un cuelgue de red en error explícito en vez de una promesa colgada.
export const transporter: Transporter = nodemailer.createTransport({
  host: process.env.ZOHO_SMTP_HOST || 'smtppro.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER || '',
    pass: process.env.ZOHO_APP_PASSWORD || '',
  },
  pool: true,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

// Verificación no bloqueante (solo con credenciales). En serverless corre por
// cold start; es opcional y puede quitarse si molesta en el log.
if (!InvalidZohoEnv) {
  transporter.verify()
    .then(() => console.log('[correo] SMTP Zoho listo.'))
    .catch(err => console.error('[correo] SMTP Zoho no verifica (revisa ZOHO_USER / ZOHO_APP_PASSWORD / host):', err.message));
} else {
  console.log('[correo] Envío de correos deshabilitado: faltan variables ZOHO_*.');
}

/**
 * Ensambla To/CC desde las filas de un SP de destinatarios.
 *  - Tipo 1 ⇒ To; Tipo 2 ⇒ CC.
 *  - Se deduplican; un correo en To se excluye de CC.
 *  - Si no hay Tipo 1 pero sí Tipo 2, el primer CC se promueve a To.
 *  - Sin correos (o envío deshabilitado) ⇒ null (no se genera PDF ni se envía).
 */
export function armarDestinatarios(rows: DestinatarioRow[]): Destinatarios | null {
  if (InvalidZohoEnv) return null;

  const uniq = (a: string[]): string[] => [...new Set(a)];

  let to = uniq(rows.filter(r => r.Tipo === 1).map(r => r.Correo));
  let cc = uniq(rows.filter(r => r.Tipo === 2).map(r => r.Correo)).filter(e => !to.includes(e));

  if (to.length === 0) {
    if (cc.length === 0) return null;
    to = [cc[0]];
    cc = cc.slice(1);
  }

  return { to, cc };
}

export interface EnviarCorreoOpts {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
  fromName?: string;
  logTag?: string;
  logRef?: string;
}

/**
 * Envía un correo vía Zoho SMTP. NO lanza: captura el error de `sendMail` y lo
 * reporta en el retorno, para no romper el hook fire-and-forget. El `from` se
 * fija a la cuenta autenticada (ZOHO_USER); otra dirección daría "Relay not permitted".
 */
export async function enviarCorreo({
  to, cc, subject, html, attachments, fromName, logTag = '[correo]', logRef = '',
}: EnviarCorreoOpts): Promise<EnvioResultado> {
  if (InvalidZohoEnv) return { ok: false, error: 'Variables de entorno ZOHO_ no establecidas.' };

  try {
    const mail: Parameters<Transporter['sendMail']>[0] = {
      from: { name: fromName || process.env.ZOHO_FROM_NAME || 'GASO', address: process.env.ZOHO_USER || '' },
      to,
      subject,
      html,
      attachments: attachments || [],
    };

    if (cc && cc.length) mail.cc = cc;

    const info = await transporter.sendMail(mail);

    return { ok: true, id: info.messageId };
  } catch (error) {
    console.error(`${logTag} ${logRef}:`, (error as Error).message);

    return { ok: false, error: error as Error };
  }
}

/** Capitaliza la primera letra; string vacío ante entrada no-string. */
export function capitalize(str: unknown): string {
  if (typeof str !== 'string') return '';

  const lower = str.toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
