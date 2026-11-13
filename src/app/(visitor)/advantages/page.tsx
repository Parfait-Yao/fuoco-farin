import type { Metadata } from 'next';
import { AdvantagesGrid, PageHero, ServiceIntro, StatsBand, Testimonials } from '@/components/visitor';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.advantages };
}

export default function AdvantagesPage() {
  const hero = getMessages('site').heroes.advantages;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />
      <AdvantagesGrid withHeading={false} />
      <StatsBand />
      <div className="mt-20">
        <ServiceIntro />
      </div>
      <Testimonials />
    </>
  );
}
