/**
 * Supported languages. The choice lives in the `locale` cookie (no URL prefix):
 * the server reads it for pages, API messages and emails, the browser reads it
 * through <html lang>. Without a cookie, visitors get SITE_DEFAULT_LOCALE.
 */
export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Fallback for server-side texts with no request or user language (emails, notifications, cron). */
export const DEFAULT_LOCALE: Locale = 'fr';
/** Language of the site for a visitor who has not chosen one (no `locale` cookie). */
export const SITE_DEFAULT_LOCALE: Locale = 'en';
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
