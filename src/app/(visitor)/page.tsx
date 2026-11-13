import { AdvantagesGrid, BestSellers, CategoriesShowcase, HeroSection, Newsletter, PromotionsBand, ServiceIntro, StatsBand, Testimonials } from '@/components/visitor';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBand />
      <BestSellers />
      <CategoriesShowcase />
      <ServiceIntro />
      <AdvantagesGrid />
      <PromotionsBand />
      <Testimonials />
      <Newsletter />
    </>
  );
}
