import { z } from 'zod';
import { route, ok, parseBody } from '@/server/http/route';
import { getSessionUser } from '@/server/auth/session';
import { prisma } from '@/lib/prisma';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, LOCALES } from '@/i18n/config';

export const dynamic = 'force-dynamic';

const schema = z.object({ locale: z.enum(LOCALES) });

/** POST /api/locale { locale } — saves the interface language (cookie, and the profile when signed in). */
export const POST = route(async (request) => {
  const { locale } = await parseBody(request, schema);
  const user = await getSessionUser().catch(() => null);
  if (user && user.locale !== locale) await prisma.user.update({ where: { id: user.id }, data: { locale } });
  const response = ok({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: 'lax' });
  return response;
});
