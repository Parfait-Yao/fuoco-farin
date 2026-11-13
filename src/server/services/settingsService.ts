import 'server-only';
import type { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toSettings } from '../mappers';
import type { settingsSchema } from '../validations/marketing';
import { activityService } from './notificationService';

const DEFAULTS = {
  id: 1,
  name: 'Fuoco & Farina',
  email: 'bonjour@fuoco-farina.ci',
  phone: '+225 07 07 25 25 25',
  address: 'Abidjan',
};

export const settingsService = {
  /** Raw row; created with defaults if the seed was not run. */
  async raw() {
    return (await prisma.restaurantSettings.findUnique({ where: { id: 1 } })) ?? prisma.restaurantSettings.create({ data: DEFAULTS });
  },

  async get() {
    return toSettings(await this.raw());
  },

  async update(patch: z.infer<typeof settingsSchema>, actorId: string) {
    await this.raw();
    const row = await prisma.restaurantSettings.update({ where: { id: 1 }, data: patch });
    await activityService.log('CATALOG', { key: 'settingsUpdated', params: undefined }, actorId);
    return toSettings(row);
  },
};
