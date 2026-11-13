import 'server-only';
import { env } from '../env';
import type { MailMessage } from './mailer';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n/config';
import { messagesFor } from '@/i18n/messages';
import { createFormat } from '@/lib/format';
import type { DeliveryMode, OrderStatus, PaymentMethod, PizzaSize } from '@/types';

/* Transactional email templates, in French or English. Inline styles only:
   email clients ignore <style> blocks. Every value interpolated in HTML is escaped. */

const BRAND = 'Fuoco & Farina';
const COLOR = '#C8341C';

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const site = () => env().NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
const asLocale = (value: string | null | undefined): Locale => (isLocale(value) ? value : DEFAULT_LOCALE);

function layout(locale: Locale, title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  const m = messagesFor(locale, 'emails');
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.href)}" style="background:${COLOR};color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#FBF6EE;font-family:Arial,Helvetica,sans-serif;color:#1F1C1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:${COLOR}">${BRAND}</p>
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(title)}</h1>
${bodyHtml}${button}
<p style="margin:32px 0 0;font-size:12px;color:#7A736E">${BRAND} · ${m.footer}</p>
</td></tr></table></td></tr></table></body></html>`;
}

const p = (text: string) => `<p style="margin:0 0 12px;line-height:1.5">${text}</p>`;

export interface OrderEmailData {
  id: string;
  number: string;
  /** Language of the customer when ordering. */
  locale: string;
  customerName: string;
  customerEmail: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  items: { name: string; quantity: number; size: PizzaSize; lineTotal: number }[];
}

function itemsTable(order: OrderEmailData, locale: Locale) {
  const m = messagesFor(locale, 'emails');
  const sizes = messagesFor(locale, 'domain').sizes;
  const money = createFormat(locale).price;
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${i.quantity} × ${escapeHtml(i.name)} <span style="color:#7A736E">(${escapeHtml(sizes[i.size].label)})</span></td><td align="right">${money(i.lineTotal)}</td></tr>`)
    .join('');
  const extra = [
    [m.subtotal, money(order.subtotal)],
    [m.delivery, order.deliveryFee ? money(order.deliveryFee) : m.free],
    ...(order.discount ? [[m.discount, `− ${money(order.discount)}`]] : []),
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 0;color:#7A736E">${k}</td><td align="right" style="color:#7A736E">${v}</td></tr>`)
    .join('');
  return `<table role="presentation" width="100%" style="border-top:1px solid #eee;border-bottom:1px solid #eee;margin:16px 0;font-size:14px">${rows}${extra}
<tr><td style="padding:8px 0;font-weight:700">${m.total}</td><td align="right" style="font-weight:700">${money(order.total)}</td></tr></table>`;
}

export const emails = {
  welcome(user: { firstName: string; email: string; locale?: string | null }): MailMessage {
    const locale = asLocale(user.locale);
    const m = messagesFor(locale, 'emails');
    return {
      to: user.email,
      subject: m.welcomeSubject(BRAND),
      html: layout(locale, m.welcomeTitle(user.firstName), p(m.welcomeBody), { label: m.welcomeCta, href: `${site()}/menu` }),
      text: m.welcomeText(BRAND, `${site()}/menu`),
    };
  },

  orderConfirmation(order: OrderEmailData): MailMessage {
    const locale = asLocale(order.locale);
    const m = messagesFor(locale, 'emails');
    const d = messagesFor(locale, 'domain');
    const href = `${site()}/account/orders/${order.id}/tracking`;
    return {
      to: order.customerEmail,
      subject: m.orderSubject(order.number),
      html: layout(
        locale,
        m.orderTitle(order.customerName),
        p(m.orderBody(escapeHtml(order.number))) + itemsTable(order, locale) + p(escapeHtml(m.orderPayment(d.payment[order.paymentMethod].label, d.delivery[order.deliveryMode].label))),
        { label: m.trackOrder, href },
      ),
      text: m.orderText(order.number, createFormat(locale).price(order.total), href),
    };
  },

  paymentConfirmation(order: OrderEmailData, reference: string): MailMessage {
    const locale = asLocale(order.locale);
    const m = messagesFor(locale, 'emails');
    const total = createFormat(locale).price(order.total);
    return {
      to: order.customerEmail,
      subject: m.paymentSubject(order.number),
      html: layout(locale, m.paymentTitle, p(m.paymentBody(total, escapeHtml(order.number))) + p(escapeHtml(m.paymentReference(reference))), {
        label: m.viewOrder,
        href: `${site()}/account/orders/${order.id}`,
      }),
      text: m.paymentText(total, order.number, reference),
    };
  },

  statusChange(order: { id: string; number: string; customerName: string; customerEmail: string; locale?: string | null }, status: OrderStatus, note?: string): MailMessage {
    const locale = asLocale(order.locale);
    const m = messagesFor(locale, 'emails');
    const sentence = m.statusSentence[status] ?? m.statusFallback;
    return {
      to: order.customerEmail,
      subject: m.statusSubject(order.number, sentence.split('.')[0]),
      html: layout(locale, m.statusTitle(order.number), p(escapeHtml(m.statusBody(order.customerName, sentence))) + (note ? p(escapeHtml(note)) : ''), {
        label: m.trackOrder,
        href: `${site()}/account/orders/${order.id}/tracking`,
      }),
      text: `${m.statusText(order.number, sentence)}${note ? ` ${note}` : ''}`,
    };
  },

  lowStock(admins: string[], items: { name: string; stock: number; threshold: number; unit: string }[], locale: Locale = DEFAULT_LOCALE): MailMessage {
    const m = messagesFor(locale, 'emails');
    const rows = items.map((i) => `<li>${m.lowStockLine(escapeHtml(i.name), `${i.stock} ${escapeHtml(i.unit)}`, `${i.threshold} ${escapeHtml(i.unit)}`)}</li>`).join('');
    return {
      to: admins,
      subject: m.lowStockSubject(items.length),
      html: layout(locale, m.lowStockTitle, p(m.lowStockIntro) + `<ul style="line-height:1.7">${rows}</ul>`, { label: m.lowStockCta, href: `${site()}/admin/stock` }),
      text: m.lowStockText(items.map((i) => `${i.name} ${i.stock}${i.unit} (${i.threshold})`).join(', ')),
    };
  },

  adminNotice(admins: string[], title: string, message: string, path: string, locale: Locale = DEFAULT_LOCALE): MailMessage {
    const m = messagesFor(locale, 'emails');
    return {
      to: admins,
      subject: `[Admin] ${title}`,
      html: layout(locale, title, p(escapeHtml(message)), { label: m.adminCta, href: `${site()}${path}` }),
      text: `${title} : ${message} ${site()}${path}`,
    };
  },

  contact(to: string, data: { name: string; email: string; subject: string; message: string }, locale: Locale = DEFAULT_LOCALE): MailMessage {
    const m = messagesFor(locale, 'emails');
    return {
      to,
      subject: `[Contact] ${data.subject}`,
      html: layout(locale, m.contactTitle(data.name), p(m.contactFrom(`${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;`)) + p(escapeHtml(data.message).replace(/\n/g, '<br>'))),
      text: `${m.contactFrom(`${data.name} <${data.email}>`)}\n\n${data.message}`,
    };
  },
};
