/** Icons of the static marketing lists. Texts: messages `site.advantages` and `site.steps` (same order). */

export const advantagesMock = [{ icon: 'LocalFireDepartment' }, { icon: 'Eco' }, { icon: 'DeliveryDining' }, { icon: 'Tune' }, { icon: 'CreditCard' }, { icon: 'Verified' }] as const;

export const orderStepsMock = [{ icon: 'MenuBook' }, { icon: 'ShoppingBasket' }, { icon: 'Whatshot' }, { icon: 'DeliveryDining' }] as const;

/**
 * Sample testimonials shown on the home page only while no real review is
 * published. Real published reviews (rating >= 4) replace them automatically.
 * `pizzaSlug` matches the seeded catalog (see src/mocks/catalog.ts).
 */
export const demoReviewsMock = [
  {
    id: 'demo-1',
    customerName: 'Aïcha K.',
    pizzaSlug: 'diavola-abidjan',
    rating: 5,
    date: '2026-10-28',
    comment: {
      fr: 'La Diavola Abidjan est incroyable : pâte légère, bien croustillante, et le miel pimenté fait toute la différence. Livrée encore chaude !',
      en: 'The Diavola Abidjan is amazing: light, crispy dough, and the hot honey makes all the difference. Delivered still hot!',
    },
  },
  {
    id: 'demo-2',
    customerName: 'Marc D.',
    pizzaSlug: 'margherita-reale',
    rating: 5,
    date: '2026-10-21',
    comment: {
      fr: 'Une vraie Margherita comme en Italie. Mozzarella fondante, tomate pleine de goût. Ma pizzeria préférée à Abidjan.',
      en: 'A true Margherita, just like in Italy. Melting mozzarella, tasty tomato. My favorite pizzeria in Abidjan.',
    },
  },
  {
    id: 'demo-3',
    customerName: 'Fatou S.',
    pizzaSlug: 'poulet-yassa',
    rating: 5,
    date: '2026-10-15',
    comment: {
      fr: 'Le Poulet Yassa en pizza, il fallait oser ! Le mélange citron-oignons confits est parfait. Je recommande les yeux fermés.',
      en: 'Chicken Yassa on a pizza, what a bold idea! The lemon and caramelized onion mix is perfect. Highly recommended.',
    },
  },
  {
    id: 'demo-4',
    customerName: 'Jean-Paul B.',
    pizzaSlug: 'parma-roquette',
    rating: 4,
    date: '2026-10-09',
    comment: {
      fr: 'Produits de qualité, burrata généreuse et commande en ligne très simple. Livraison en 30 minutes, rien à redire.',
      en: 'Quality ingredients, generous burrata and a very easy online order. Delivered in 30 minutes, nothing to complain about.',
    },
  },
  {
    id: 'demo-5',
    customerName: 'Mariam T.',
    pizzaSlug: 'pepperoni-classica',
    rating: 5,
    date: '2026-09-30',
    comment: {
      fr: 'Mes enfants adorent la Pepperoni Classica. Le suivi de commande en temps réel est super pratique.',
      en: 'My kids love the Pepperoni Classica. Real-time order tracking is really handy.',
    },
  },
] as const;
