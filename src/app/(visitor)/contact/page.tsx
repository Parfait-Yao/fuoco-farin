import type { Metadata } from 'next';
import { ContactContent, PageHero } from '@/components/visitor';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.contact };
}

export default function ContactPage() {
  const hero = getMessages('site').heroes.contact;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />
      <ContactContent />
    </>
  );
}
