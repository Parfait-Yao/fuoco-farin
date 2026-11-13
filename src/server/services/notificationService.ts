import 'server-only';
import type { ActivityKind, NotificationKind, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { toActivity, toNotification } from '../mappers';
import { notFound } from '../http/errors';
import type { SessionUser } from '../auth/session';
import { emails } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/server';
import { renderActivity, renderNotification, type ActivityEvent, type NotificationEvent } from '@/i18n/events';

export type { ActivityEvent, NotificationEvent };

type Db = Prisma.TransactionClient | typeof prisma;

export interface NotificationInput {
  kind: NotificationKind;
  event: NotificationEvent;
  href?: string;
}

/** Row data: the key and variables, plus a French copy for tools reading the table directly. */
function notificationRow(input: NotificationInput) {
  const fr = renderNotification(input.event, DEFAULT_LOCALE)!;
  return {
    kind: input.kind,
    title: fr.title.slice(0, 300),
    message: fr.message.slice(0, 1000),
    key: input.event.key,
    params: input.event.params as Prisma.InputJsonValue,
    href: input.href,
  };
}

export const notificationService = {
  /** One notification for one user. */
  async notifyUser(userId: string, input: NotificationInput, db: Db = prisma) {
    await db.notification.create({ data: { userId, ...notificationRow(input) } });
  },

  /** Fans the notification out to every active admin; optionally emails them in their language. */
  async notifyAdmins(input: NotificationInput, options: { email?: boolean } = {}, db: Db = prisma) {
    const admins = await db.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null }, select: { id: true, email: true, locale: true } });
    if (!admins.length) return;
    const row = notificationRow(input);
    await db.notification.createMany({ data: admins.map((a) => ({ userId: a.id, ...row })) });
    if (options.email) {
      const settings = await db.restaurantSettings.findUnique({ where: { id: 1 }, select: { notifyByEmail: true } });
      if (!settings?.notifyByEmail) return;
      for (const locale of ['fr', 'en'] as const) {
        const to = admins.filter((a) => (isLocale(a.locale) ? a.locale : DEFAULT_LOCALE) === locale).map((a) => a.email);
        const text = renderNotification(input.event, locale)!;
        if (to.length) queueMail(emails.adminNotice(to, text.title, text.message, input.href ?? '/admin', locale));
      }
    }
  },

  async list(user: SessionUser) {
    const rows = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map((n) => toNotification(n, user.role === 'ADMIN' ? 'admin' : 'client'));
  },

  async setRead(user: SessionUser, id: string, read: boolean) {
    const { count } = await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: read ? new Date() : null } });
    if (!count) throw notFound(getMessages('api').notificationNotFound);
  },

  async markAll(user: SessionUser) {
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  },

  async remove(user: SessionUser, id: string) {
    const { count } = await prisma.notification.deleteMany({ where: { id, userId: user.id } });
    if (!count) throw notFound(getMessages('api').notificationNotFound);
  },
};

export const activityService = {
  async log(kind: ActivityKind, event: ActivityEvent, actorId?: string | null, db: Db = prisma) {
    const message = renderActivity(event, DEFAULT_LOCALE)!.slice(0, 300);
    await db.activityLog.create({ data: { kind, message, key: event.key, params: event.params as Prisma.InputJsonValue, actorId: actorId ?? null } });
  },

  async recent(take = 50) {
    const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take });
    return rows.map(toActivity);
  },
};
