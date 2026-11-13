import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../env';

let transporter: Transporter | null = null;

export const isMailConfigured = () => Boolean(env().SMTP_HOST);

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (transporter) return transporter;
  const e = env();
  transporter = nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_PORT === 465,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email. Never throws: a mail failure must not roll back an order
 * or a payment. Without SMTP configuration (development), the message is
 * logged instead of sent.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const t = getTransporter();
  const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
  if (!to) return false;
  if (!t) {
    console.info(`[mail:dev] to=${to} subject="${message.subject}"`);
    return false;
  }
  try {
    await t.sendMail({ from: env().MAIL_FROM, to, subject: message.subject, html: message.html, text: message.text });
    return true;
  } catch (error) {
    console.error('[mail] send failed', { to, subject: message.subject, error: (error as Error).message });
    return false;
  }
}

/** Fire-and-forget helper for request handlers. */
export function queueMail(message: MailMessage | null) {
  if (message) void sendMail(message);
}
