import { api } from '@/lib/api';
import { toApiLine } from '@/store/cartStore';
import type { Address, CartItem, DeliveryMode, Order, PaymentMethod } from '@/types';

export interface PlaceOrderInput {
  contact: { fullName: string; email: string; phone: string };
  address: Omit<Address, 'id' | 'label'>;
  items: CartItem[];
  promoCode?: string;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
}

export interface Quote {
  lines: { index: number; pizzaId: string | null; name: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promo: { id: string; code: string; label: string } | null;
  promoError: string | null;
  available: boolean;
  shortages: string[];
}

export const orderService = {
  /** Server prices for the current cart (the only totals that count). */
  quote(items: CartItem[], deliveryMode: DeliveryMode, promoCode?: string): Promise<Quote> {
    return api.post<Quote>('/api/cart/quote', { items: items.map(toApiLine), deliveryMode, promoCode });
  },

  /**
   * Creates the order on the server. For online payment, the browser then
   * leaves for the Stripe payment page: this promise does not resolve in that
   * case. The order is confirmed paid only after the server checked the
   * payment with Stripe (return page or webhook).
   */
  async placeOrder(input: PlaceOrderInput): Promise<{ order: Order; guestToken: string | null }> {
    const { order, guestToken } = await api.post<{ order: Order; guestToken: string | null }>('/api/orders', {
      items: input.items.map(toApiLine),
      deliveryMode: input.deliveryMode,
      promoCode: input.promoCode,
      contact: input.contact,
      address: { street: input.address.street, district: input.address.district, city: input.address.city, details: input.address.details },
      paymentMethod: input.paymentMethod,
    });
    if (input.paymentMethod === 'cash') return { order, guestToken };
    await this.payOnline(order.id, guestToken);
    return new Promise(() => undefined);
  },

  /** Sends the browser to the Stripe payment page of an unpaid order. */
  async payOnline(orderId: string, guestToken: string | null = null): Promise<void> {
    const { url } = await api.post<{ url: string }>('/api/payments/stripe/checkout', { orderId, guestToken });
    window.location.assign(url);
  },

  /** Back from Stripe with a session id: the server checks the payment and returns the order. */
  confirmOnlinePayment(orderId: string, sessionId: string, guestToken: string | null): Promise<Order> {
    return api.post<Order>('/api/payments/stripe/verify', { orderId, sessionId, guestToken });
  },

  /** Back from Stripe without paying: cancels the unpaid order and releases its stock. */
  cancelOnlinePayment(orderId: string, guestToken: string | null): Promise<unknown> {
    return api.post('/api/payments/stripe/cancel', { orderId, guestToken });
  },
};
