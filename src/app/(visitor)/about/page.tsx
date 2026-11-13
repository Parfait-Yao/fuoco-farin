import type { Metadata } from 'next';
import { AboutContent, AboutHero } from '@/components/visitor';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.about };
}

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutContent />
    </>
  );
}
