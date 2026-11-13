import type { Locale } from './config';
import { messagesFor, type Messages } from './messages';

type ValidationKey = keyof Messages<'validation'>;

/**
 * Message reference for a Zod schema: "@key" or "@key:arg". Schemas are built
 * once at module load, so they store the key; `translateValidation` picks the
 * text in the language of the request or page that shows the error.
 */
export const vm = (key: ValidationKey, arg?: string | number) => (arg === undefined ? `@${key}` : `@${key}:${arg}`);

export function translateValidation(message: string | undefined, locale: Locale): string {
  const m = messagesFor(locale, 'validation');
  if (!message) return m.invalid;
  if (!message.startsWith('@')) return message;
  const [key, arg = ''] = message.slice(1).split(':');
  const entry = m[key as ValidationKey] as string | ((arg: string) => string) | undefined;
  if (entry === undefined) return message;
  return typeof entry === 'function' ? entry(arg) : entry;
}
