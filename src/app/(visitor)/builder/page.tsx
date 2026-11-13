import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Box, Skeleton } from '@mui/material';
import { PageHero } from '@/components/visitor';
import { PizzaBuilder } from '@/features/builder/PizzaBuilder';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.builder };
}

export default function BuilderPage() {
  const hero = getMessages('site').heroes.builder;
  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} subtitle={hero.subtitle} />
      <div className="container-page pb-10">
        <Suspense fallback={<Box className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={200} />)}</Box>}>
          <PizzaBuilder />
        </Suspense>
      </div>
    </>
  );
}
