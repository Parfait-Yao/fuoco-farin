import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import Providers from './providers';
import { getLocale, getMessages } from '@/i18n/server';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['500', '600', '700', '800'] });
const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export function generateMetadata(): Metadata {
  const t = getMessages('common');
  return {
    title: { default: t.metaTitle, template: '%s · Fuoco & Farina' },
    description: t.metaDescription,
  };
}

export const viewport: Viewport = { themeColor: '#C8341C', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Language from the `locale` cookie (English by default): no URL prefix.
  const locale = getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body id="__app">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
