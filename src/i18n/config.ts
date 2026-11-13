/**
 * Supported languages. The choice lives in the `locale` cookie (no URL prefix):
 * the server reads it for pages, API messages and emails, the browser reads it
 * through <html lang>. Without a cookie, Accept-Language decides.
 */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';
export const LOCALE_COOKIE = 'locale';
/** One year. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** BCP 47 tags used by Intl formatters. */
export const INTL_LOCALE: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' };

export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  fr: { short: 'FR', name: 'Français' },
  en: { short: 'EN', name: 'English' },
};

export const isLocale = (value: unknown): value is Locale => value === 'fr' || value === 'en';

/** Picks the first supported language of an Accept-Language header, by quality. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.split('=')[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => isLocale(r.lang))?.lang as Locale | undefined ?? DEFAULT_LOCALE;
}
