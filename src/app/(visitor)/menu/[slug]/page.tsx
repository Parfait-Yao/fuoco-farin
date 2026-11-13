import type { Metadata } from 'next';
import { PizzaDetailView } from '@/components/visitor';
import { prisma } from '@/lib/prisma';
import { pickLocalized } from '@/i18n/server';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const pizza = await prisma.pizza
    .findFirst({ where: { slug: params.slug, active: true, deletedAt: null }, select: { name: true, nameEn: true, description: true, descriptionEn: true, imageUrl: true } })
    .catch(() => null);
  if (!pizza) return { title: 'Pizza' };
  return { title: pickLocalized(pizza.name, pizza.nameEn), description: pickLocalized(pizza.description, pizza.descriptionEn), openGraph: { images: [pizza.imageUrl] } };
}

export default function PizzaPage({ params }: { params: { slug: string } }) {
  return <PizzaDetailView slug={params.slug} />;
}
