import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyHmac } from '@/server/services/paymentService';
import { canTransition } from '@/server/services/orderService';
import { hardenCookie } from '@/utils/supabase/server';
import { escapeHtml } from '@/server/emails/templates';
import { createOrderSchema, quoteSchema } from '@/server/validations/order';
import { registerSchema } from '@/server/validations/auth';
import { hit } from '@/server/lib/rateLimit';
import { toErrorResponse } from '@/server/http/route';
import { AppError } from '@/server/http/errors';

describe('HMAC signatures', () => {
  const secret = 'test_secret';
  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('hex');
  it('accepts a valid HMAC and rejects tampered ones', () => {
    expect(verifyHmac('order_1|pay_1', sign('order_1|pay_1'), secret)).toBe(true);
    expect(verifyHmac('order_1|pay_2', sign('order_1|pay_1'), secret)).toBe(false);
    expect(verifyHmac('order_1|pay_1', '', secret)).toBe(false);
    expect(verifyHmac('order_1|pay_1', 'short', secret)).toBe(false);
  });
});

describe('order status flow', () => {
  it('only moves forward, cancel allowed until delivered', () => {
    expect(canTransition('RECEIVED', 'IN_KITCHEN')).toBe(true);
    expect(canTransition('RECEIVED', 'DELIVERED')).toBe(true);
    expect(canTransition('IN_KITCHEN', 'RECEIVED')).toBe(false);
    expect(canTransition('SENT_FOR_DELIVERY', 'CANCELLED')).toBe(true);
    expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false);
    expect(canTransition('CANCELLED', 'RECEIVED')).toBe(false);
    expect(canTransition('IN_KITCHEN', 'IN_KITCHEN')).toBe(false);
  });
});

describe('session cookies', () => {
  it('are HttpOnly, SameSite=Lax, and session-only without "remember me"', () => {
    const remembered = hardenCookie({ maxAge: 3600, path: '/' }, true);
    expect(remembered).toMatchObject({ httpOnly: true, sameSite: 'lax', maxAge: 3600 });
    const session = hardenCookie({ maxAge: 3600, expires: new Date() }, false);
    expect(session.httpOnly).toBe(true);
    expect(session.maxAge).toBeUndefined();
    expect(session.expires).toBeUndefined();
    // Deletion cookies keep maxAge 0.
    expect(hardenCookie({ maxAge: 0 }, false).maxAge).toBe(0);
  });
});

describe('input validation', () => {
  const uuid = '7f0f2c0e-1b2c-4c3d-8e9f-0a1b2c3d4e5f';
  it('has no price field: a client price is stripped', () => {
    const parsed = quoteSchema.parse({ items: [{ pizzaId: uuid, size: 'medium', quantity: 2, unitPrice: 1 }], deliveryMode: 'standard' });
    expect(parsed.items[0]).not.toHaveProperty('unitPrice');
  });
  it('requires exactly one of pizzaId or custom', () => {
    expect(() => quoteSchema.parse({ items: [{ size: 'medium', quantity: 1 }], deliveryMode: 'standard' })).toThrow();
    expect(() =>
      quoteSchema.parse({ items: [{ pizzaId: uuid, custom: { baseId: uuid, sauceId: uuid, cheeseId: uuid, veggieIds: [] }, size: 'medium', quantity: 1 }], deliveryMode: 'standard' }),
    ).toThrow();
  });
  it('bounds quantities and rejects an empty cart', () => {
    expect(() => quoteSchema.parse({ items: [{ pizzaId: uuid, size: 'medium', quantity: 21 }], deliveryMode: 'standard' })).toThrow();
    expect(() => quoteSchema.parse({ items: [], deliveryMode: 'standard' })).toThrow();
  });
  it('validates contact data on orders', () => {
    const base = { items: [{ pizzaId: uuid, size: 'small', quantity: 1 }], deliveryMode: 'pickup', paymentMethod: 'cash', address: { street: 'Rue 12, Cocody', district: 'Cocody', city: 'Abidjan' } };
    expect(() => createOrderSchema.parse({ ...base, contact: { fullName: 'Awa K', email: 'bad', phone: '+225 07 00 00 00 00' } })).toThrow();
    expect(createOrderSchema.parse({ ...base, contact: { fullName: 'Awa K', email: 'AWA@X.CI', phone: '+225 07 00 00 00 00' } }).contact.email).toBe('awa@x.ci');
  });
  it('sign-up has no role field', () => {
    const parsed = registerSchema.parse({ firstName: 'Awa', lastName: 'Koné', email: 'a@b.ci', phone: '+225 07 00 00 00 00', password: 'Secret123', role: 'admin' });
    expect(parsed).not.toHaveProperty('role');
  });
});

describe('helpers', () => {
  it('escapes HTML in emails', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
  });
  it('rate limiter blocks after the limit', () => {
    const key = `test:${Math.random()}`;
    expect(hit(key, 2, 60_000).allowed).toBe(true);
    expect(hit(key, 2, 60_000).allowed).toBe(true);
    expect(hit(key, 2, 60_000).allowed).toBe(false);
  });
  it('maps errors to the API envelope without leaking internals', async () => {
    const known = await toErrorResponse(new AppError('OUT_OF_STOCK', 'Rupture')).json();
    expect(known).toEqual({ ok: false, error: { code: 'OUT_OF_STOCK', message: 'Rupture' } });
    const original = console.error;
    console.error = () => undefined;
    const unknown = toErrorResponse(new Error('db password is hunter2'));
    console.error = original;
    expect(unknown.status).toBe(500);
    expect(JSON.stringify(await unknown.json())).not.toContain('hunter2');
  });
});
