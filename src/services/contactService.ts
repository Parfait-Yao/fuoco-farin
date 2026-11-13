import { api } from '@/lib/api';

/** Newsletter and contact form, stored in the database and emailed to the restaurant. */
export const contactService = {
  async subscribeNewsletter(email: string): Promise<void> {
    await api.post('/api/newsletter', { email });
  },
  async sendMessage(payload: { name: string; email: string; subject: string; message: string }): Promise<void> {
    await api.post('/api/contact', payload);
  },
};
