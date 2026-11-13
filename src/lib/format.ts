import { CURRENCY } from '@/constants';
import { INTL_LOCALE, type Locale } from '@/i18n/config';

/** fr-FR uses U+202F / U+00A0 as separators, missing from many web fonts. */
const withNbsp = (s: string) => s.replace(/[  ]/g, ' ');

/** Converts an amount in cents to dollars, for form inputs. */
export const centsToUnits = (cents: number) => Math.round(cents) / 100;
/** Converts a dollar amount typed in a form to cents. */
export const unitsToCents = (units: number) => Math.round(units * 100);

export type Formatter = ReturnType<typeof createFormat>;

/**
 * Locale-bound formatters. In components use `useFormat()` (src/i18n/client),
 * on the server `createFormat(getLocale())`.
 * Money amounts are integers in cents.
 */
export function createFormat(locale: Locale) {
  const tag = INTL_LOCALE[locale];
  const money = new Intl.NumberFormat(tag, { style: 'currency', currency: CURRENCY, currencyDisplay: 'narrowSymbol' });
  const number = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: 'auto', style: 'short' });

  const date = (iso: string | Date, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) =>
    withNbsp(new Intl.DateTimeFormat(tag, options).format(new Date(iso)));

  return {
    locale,
    /** 1299 -> "$12.99" (en) / "12,99 $" (fr) */
    price: (cents: number) => withNbsp(money.format(Math.round(cents) / 100)),
    number: (value: number) => withNbsp(number.format(value)),
    date,
    dateTime: (iso: string | Date) => date(iso, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    time: (iso: string | Date) => date(iso, { hour: '2-digit', minute: '2-digit' }),
    relative: (iso: string | Date) => {
      const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
      if (minutes < 1) return relative.format(0, 'second');
      if (minutes < 60) return relative.format(-minutes, 'minute');
      const hours = Math.round(minutes / 60);
      if (hours < 24) return relative.format(-hours, 'hour');
      const days = Math.round(hours / 24);
      if (days < 30) return relative.format(-days, 'day');
      return date(iso);
    },
  };
}

export function initials(firstName: string, lastName = ''): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
