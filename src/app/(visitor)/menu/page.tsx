import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CatalogView, PageHero } from '@/components/visitor';
import { CardGridSkeleton } from '@/components/ui';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.menu };
}

export default function MenuPage() {
  const hero = getMessages('site').heroes.menu;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />
      <Suspense fallback={<div className="container-page"><CardGridSkeleton /></div>}>
        <CatalogView />
      </Suspense>
    </>
  );
}
