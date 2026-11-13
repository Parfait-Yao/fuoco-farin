import type { Locale } from './config';
import { messagesFor, type Messages } from './messages';

/*
 * Notifications and activity entries are stored as a key plus variables and
 * rendered when read, in the reader's language (messages namespace `events`).
 */

type NotificationTexts = Messages<'events'>['notifications'];
type ActivityTexts = Messages<'events'>['activity'];

/** A notification text key with its variables (messages `events.notifications`). */
export type NotificationEvent = { [K in keyof NotificationTexts]: { key: K; params: Parameters<NotificationTexts[K]>[0] } }[keyof NotificationTexts];
/** An activity text key with its variables (messages `events.activity`). */
export type ActivityEvent = { [K in keyof ActivityTexts]: { key: K; params: Parameters<ActivityTexts[K]>[0] } }[keyof ActivityTexts];

/** Renders a notification in `locale`. */
export function renderNotification(event: { key: string; params: unknown }, locale: Locale) {
  const render = messagesFor(locale, 'events').notifications[event.key as NotificationEvent['key']] as ((p: unknown) => { title: string; message: string }) | undefined;
  return render ? render(event.params ?? {}) : null;
}

/** Renders an activity entry in `locale`. */
export function renderActivity(event: { key: string; params: unknown }, locale: Locale) {
  const render = messagesFor(locale, 'events').activity[event.key as ActivityEvent['key']] as ((p: unknown) => string) | undefined;
  return render ? render(event.params ?? {}) : null;
}
