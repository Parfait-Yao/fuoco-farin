import 'server-only';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toAddress, toCustomer, toOrder, toUser } from '../mappers';
import { notFound } from '../http/errors';
import type { SessionUser } from '../auth/session';
import type { addressSchema, preferencesSchema, profileSchema } from '../validations/user';
import { hasSupabaseAdmin, supabaseAdmin } from '@/utils/supabase/admin';
import { storageService } from './storageService';
import { activityService } from './notificationService';
import { emails } from '../emails/templates';
import { queueMail } from '../emails/mailer';
import { getLocale, getMessages } from '@/i18n/server';

/** API messages in the request language. */
const msg = () => getMessages('api');

type AddressInput = z.infer<typeof addressSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  orderUpdatesSms: true,
  orderUpdatesEmail: true,
  promotions: true,
  newsletter: false,
  defaultDelivery: 'standard',
  defaultPayment: 'card',
};

export const userService = {
  /** Profile payload for /api/auth/me. Sends the welcome email once, after verification. */
  async me(user: SessionUser) {
    const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    // Emails follow the language last used on the site.
    const locale = getLocale();
    if (user.locale !== locale) {
      await prisma.user.update({ where: { id: user.id }, data: { locale } });
      user = { ...user, locale };
    }
    if (user.role === 'CLIENT' && user.emailVerifiedAt && !user.welcomeEmailSentAt) {
      const { count } = await prisma.user.updateMany({ where: { id: user.id, welcomeEmailSentAt: null }, data: { welcomeEmailSentAt: new Date() } });
      if (count) {
        queueMail(emails.welcome(user));
        await activityService.log('CUSTOMER', { key: 'customerNew', params: { name: `${user.firstName} ${user.lastName}`.trim() } }, user.id);
      }
    }
    return {
      user: toUser(user, addresses),
      preferences: { ...DEFAULT_PREFERENCES, ...((user.preferences as Partial<Preferences> | null) ?? {}) },
    };
  },

  /**
   * Profile update. Email changes go through Supabase Auth (confirmation
   * link sent to the new address); the database copy follows via trigger.
   */
  async updateProfile(user: SessionUser, input: z.infer<typeof profileSchema>, changeEmail: (email: string) => Promise<void>) {
    let avatarUrl = user.avatarUrl;
    let avatarKey = user.avatarKey;
    if (input.avatar !== undefined && input.avatar !== (user.avatarUrl ?? '')) {
      avatarUrl = input.avatar || null;
      avatarKey = input.avatar ? await storageService.assertImage(input.avatar, 'avatars', user.id) : null;
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone, avatarUrl, avatarKey },
    });
    if (user.avatarKey && user.avatarKey !== avatarKey) await storageService.remove(user.avatarKey);
    const emailChanged = input.email !== user.email;
    if (emailChanged) await changeEmail(input.email);
    // Keep Supabase metadata in sync for the auth emails.
    if (hasSupabaseAdmin()) {
      await supabaseAdmin().auth.admin.updateUserById(user.id, { user_metadata: { first_name: input.firstName, last_name: input.lastName, phone: input.phone, avatar_url: avatarUrl } }).catch(() => undefined);
    }
    return { ...(await this.me(updated)), emailChangePending: emailChanged };
  },

  async updatePreferences(user: SessionUser, input: Preferences) {
    await prisma.user.update({ where: { id: user.id }, data: { preferences: input as Prisma.InputJsonValue } });
    if (input.newsletter) {
      await prisma.newsletterSubscriber.upsert({ where: { email: user.email }, update: { unsubscribedAt: null }, create: { email: user.email } });
    } else {
      await prisma.newsletterSubscriber.updateMany({ where: { email: user.email, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
    }
    return input;
  },

  async listAddresses(user: SessionUser) {
    const rows = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
    return rows.map(toAddress);
  },

  /** Create or update. The first address, or one flagged default, becomes the only default. */
  async saveAddress(user: SessionUser, input: AddressInput, id?: string) {
    await prisma.$transaction(async (tx) => {
      if (id) {
        const existing = await tx.address.findFirst({ where: { id, userId: user.id } });
        if (!existing) throw notFound(msg().addressNotFound);
      }
      const count = await tx.address.count({ where: { userId: user.id } });
      const makeDefault = Boolean(input.isDefault) || count === 0 || (count === 1 && Boolean(id));
      if (makeDefault) await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
      const data = { label: input.label, street: input.street, district: input.district, city: input.city, details: input.details ?? null, ...(makeDefault ? { isDefault: true } : {}) };
      if (id) await tx.address.update({ where: { id }, data });
      else await tx.address.create({ data: { ...data, userId: user.id } });
    });
    return this.listAddresses(user);
  },

  async deleteAddress(user: SessionUser, id: string) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({ where: { id, userId: user.id } });
      if (!existing) throw notFound(msg().addressNotFound);
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return this.listAddresses(user);
  },

  /* ─────────── Admin ─────────── */

  async customers() {
    const rows = await prisma.user.findMany({ where: { role: 'CLIENT', deletedAt: null }, include: { addresses: true }, orderBy: { createdAt: 'desc' } });
    return rows.map(toCustomer);
  },

  async customer(id: string) {
    const row = await prisma.user.findFirst({ where: { id, role: 'CLIENT', deletedAt: null }, include: { addresses: true } });
    if (!row) throw notFound(msg().customerNotFound);
    const orders = await prisma.order.findMany({ where: { userId: id }, include: { items: true, history: true }, orderBy: { createdAt: 'desc' } });
    return { customer: toCustomer(row), addresses: row.addresses.map(toAddress), orders: orders.map(toOrder) };
  },

  /** Blocks or unblocks a customer. Blocking also revokes their Supabase sessions. */
  async setCustomerStatus(id: string, status: 'active' | 'blocked', actorId: string) {
    const row = await prisma.user.findFirst({ where: { id, role: 'CLIENT', deletedAt: null } });
    if (!row) throw notFound(msg().customerNotFound);
    const updated = await prisma.user.update({ where: { id }, data: { status: status === 'blocked' ? 'BLOCKED' : 'ACTIVE' }, include: { addresses: true } });
    if (hasSupabaseAdmin()) {
      await supabaseAdmin()
        .auth.admin.updateUserById(id, { ban_duration: status === 'blocked' ? '876000h' : 'none' })
        .catch((e: Error) => console.error('[users] ban sync failed', e.message));
    }
    await activityService.log('CUSTOMER', { key: 'customerStatus', params: { name: `${row.firstName} ${row.lastName}`.trim(), blocked: status === 'blocked' } }, actorId);
    return toCustomer(updated);
  },
};
