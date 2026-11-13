import type { Metadata } from 'next';
import { LegalContent, PageHero } from '@/components/visitor';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.terms };
}

export default function LegalPage() {
  const hero = getMessages('site').heroes.terms;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} />
      <LegalContent kind="terms" />
    </>
  );
}
