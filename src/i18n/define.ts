/**
 * Declares one message namespace in both languages. The English object must
 * have exactly the French shape, so a missing key fails the type check.
 * Values are strings, or functions for text with variables or plurals.
 */
export function defineMessages<T extends Record<string, unknown>>(messages: { fr: T; en: NoInfer<T> }) {
  return messages;
}
