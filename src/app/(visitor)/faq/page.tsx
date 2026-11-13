import type { Metadata } from 'next';
import { FaqContent, PageHero } from '@/components/visitor';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.faq };
}

export default function FaqPage() {
  const hero = getMessages('site').heroes.faq;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />
      <FaqContent />
    </>
  );
}
