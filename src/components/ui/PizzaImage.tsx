'use client';

import * as React from 'react';
import Image, { type ImageProps } from 'next/image';
import { FALLBACK_IMAGE } from '@/mocks/images';

/** Hosts declared in next.config.mjs (optimized by next/image). */
const R2_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname : null;
  } catch {
    return null;
  }
})();
const OPTIMIZED_HOSTS = ['images.unsplash.com', 'plus.unsplash.com', 'i.pravatar.cc', ...(R2_HOST ? [R2_HOST] : [])];

function isOptimizable(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') return true;
  if (src.startsWith('/')) return true;
  try {
    return OPTIMIZED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

/** next/image with a local illustrated fallback when the remote photo fails. */
export function PizzaImage({ src, alt, unoptimized, ...rest }: ImageProps) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const finalSrc = failed || !src ? FALLBACK_IMAGE : src;
  return <Image {...rest} src={finalSrc} alt={alt} unoptimized={unoptimized || !isOptimizable(finalSrc)} onError={() => setFailed(true)} />;
}
