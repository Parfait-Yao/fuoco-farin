import type { Locale } from '../config';
import account from './account';
import admin from './admin';
import api from './api';
import auth from './auth';
import builder from './builder';
import cart from './cart';
import checkout from './checkout';
import catalog from './catalog';
import common from './common';
import domain from './domain';
import emails from './emails';
import events from './events';
import site from './site';
import titles from './titles';
import validation from './validation';

/**
 * Every message namespace. Both languages are bundled: the dictionaries are
 * small, and switching language needs no extra request.
 */
const namespaces = {
  account,
  admin,
  api,
  auth,
  builder,
  cart,
  checkout,
  catalog,
  common,
  domain,
  emails,
  events,
  site,
  titles,
  validation,
};

type Namespaces = typeof namespaces;
export type Namespace = keyof Namespaces;
export type Messages<N extends Namespace> = Namespaces[N]['fr'];

export function messagesFor<N extends Namespace>(locale: Locale, ns: N): Messages<N> {
  return namespaces[ns][locale] as Messages<N>;
}
