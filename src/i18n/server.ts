import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from './config';
import { messagesFor, type Messages, type Namespace } from './messages';

/**
 * Language of the current request: `locale` cookie, else Accept-Language.
 * Outside a request (cron jobs, scripts, tests) it falls back to French.
 */
export function getLocale(): Locale {
  try {
    const cookie = cookies().get(LOCALE_COOKIE)?.value;
    if (isLocale(cookie)) return cookie;
    return negotiateLocale(headers().get('accept-language'));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Messages of one namespace, in the request language unless `locale` is given. */
export function getMessages<N extends Namespace>(ns: N, locale: Locale = getLocale()): Messages<N> {
  return messagesFor(locale, ns);
}

/** Picks the English text when the page is in English and the text exists. */
export function pickLocalized(fr: string, en: string | null | undefined, locale: Locale = getLocale()): string {
  return locale === 'en' && en?.trim() ? en : fr;
}
