import { useId } from 'react';
import type { Locale } from '@/i18n/config';

/**
 * Inline SVG flag for a locale. Emoji flags are not used: Windows shows them as
 * two letters ("FR") instead of a flag.
 */
export function LocaleFlag({ locale, size = 20 }: { locale: Locale; size?: number }) {
  // One clip path id per flag: the header and the mobile menu can show two UK flags.
  const clipId = `locale-flag-uk-${useId().replace(/:/g, '')}`;
  const width = size;
  const height = Math.round((size * 2) / 3);
  const common = {
    width,
    height,
    'aria-hidden': true,
    focusable: false,
    style: { display: 'block', borderRadius: 2, boxShadow: '0 0 0 1px rgba(0,0,0,0.12)', flexShrink: 0 },
  } as const;

  if (locale === 'fr') {
    return (
      <svg viewBox="0 0 3 2" {...common}>
        <rect width="1" height="2" x="0" fill="#002654" />
        <rect width="1" height="2" x="1" fill="#FFFFFF" />
        <rect width="1" height="2" x="2" fill="#CE1126" />
      </svg>
    );
  }

  // United Kingdom (Union Jack).
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="none" {...common}>
      <clipPath id={clipId}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clipId})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
