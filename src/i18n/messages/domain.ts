import { defineMessages } from '../define';
import type { DeliveryMode, IngredientType, Order, OrderStatus, PaymentMethod, PizzaSize, StockUnit } from '@/types';

type Labels<K extends string, V> = Record<K, V>;

/** Business vocabulary shared by the site, the admin, the API and the emails. */
export default defineMessages({
  fr: {
    tagline: 'Pizzas au feu de bois, livrées brûlantes à Abidjan.',
    openingHours: 'Tous les jours, 11h00 – 23h30',
    sizes: {
      small: { label: 'Petite', diameter: '26 cm' },
      medium: { label: 'Moyenne', diameter: '31 cm' },
      large: { label: 'Grande', diameter: '38 cm' },
    } as Labels<PizzaSize, { label: string; diameter: string }>,
    orderStatus: {
      received: { label: 'Commande reçue', description: 'Votre commande est confirmée par le restaurant.' },
      preparing: { label: 'En préparation', description: 'Nos pizzaïolos façonnent et enfournent votre pizza.' },
      delivering: { label: 'En livraison', description: 'Votre livreur est en route.' },
      delivered: { label: 'Livrée', description: 'Bon appétit !' },
      cancelled: { label: 'Annulée', description: 'La commande a été annulée.' },
    } as Labels<OrderStatus, { label: string; description: string }>,
    paymentStatus: {
      paid: 'Payée',
      pending: 'En attente',
      refunded: 'Remboursée',
      failed: 'Échouée',
      cancelled: 'Annulée',
    } as Labels<Order['paymentStatus'], string>,
    payment: {
      orange_money: { label: 'Orange Money', hint: 'Validation par code sur votre téléphone' },
      mtn_momo: { label: 'MTN MoMo', hint: 'Paiement mobile MTN' },
      wave: { label: 'Wave', hint: 'Sans frais, validation instantanée' },
      card: { label: 'Paiement en ligne', hint: 'Carte bancaire via Stripe (mode test)' },
      cash: { label: 'Espèces à la livraison', hint: 'Prévoyez l’appoint' },
    } as Labels<PaymentMethod, { label: string; hint: string }>,
    delivery: {
      standard: { label: 'Livraison standard', eta: '35 – 45 min', description: 'Livrée chaude dans un sac isotherme.' },
      express: { label: 'Livraison express', eta: '20 – 25 min', description: 'Coursier dédié, priorité en cuisine.' },
      pickup: { label: 'À emporter', eta: 'Prête en 15 min', description: 'Récupérez-la au comptoir, sans frais.' },
    } as Labels<DeliveryMode, { label: string; eta: string; description: string }>,
    ingredientTypes: { base: 'Bases', sauce: 'Sauces', cheese: 'Fromages', veggie: 'Légumes' } as Labels<IngredientType, string>,
    ingredientType: { base: 'Base', sauce: 'Sauce', cheese: 'Fromage', veggie: 'Légume' } as Labels<IngredientType, string>,
    units: { kg: 'kg', g: 'g', L: 'L', pièces: 'pièces' } as Labels<StockUnit, string>,
    system: 'Système',
    customer: 'Client',
    customPizza: 'Pizza personnalisée',
    myPizza: 'Ma pizza',
  },
  en: {
    tagline: 'Wood-fired pizzas, delivered piping hot in Abidjan.',
    openingHours: 'Every day, 11:00 AM – 11:30 PM',
    sizes: {
      small: { label: 'Small', diameter: '10"' },
      medium: { label: 'Medium', diameter: '12"' },
      large: { label: 'Large', diameter: '15"' },
    },
    orderStatus: {
      received: { label: 'Order received', description: 'The restaurant has confirmed your order.' },
      preparing: { label: 'Preparing', description: 'Our pizzaioli are shaping and baking your pizza.' },
      delivering: { label: 'Out for delivery', description: 'Your driver is on the way.' },
      delivered: { label: 'Delivered', description: 'Enjoy your meal!' },
      cancelled: { label: 'Cancelled', description: 'The order was cancelled.' },
    },
    paymentStatus: {
      paid: 'Paid',
      pending: 'Pending',
      refunded: 'Refunded',
      failed: 'Failed',
      cancelled: 'Cancelled',
    },
    payment: {
      orange_money: { label: 'Orange Money', hint: 'Confirm with a code on your phone' },
      mtn_momo: { label: 'MTN MoMo', hint: 'MTN mobile payment' },
      wave: { label: 'Wave', hint: 'No fees, instant confirmation' },
      card: { label: 'Online payment', hint: 'Credit card via Stripe (test mode)' },
      cash: { label: 'Cash on delivery', hint: 'Please have the exact amount ready' },
    },
    delivery: {
      standard: { label: 'Standard delivery', eta: '35 – 45 min', description: 'Delivered hot in an insulated bag.' },
      express: { label: 'Express delivery', eta: '20 – 25 min', description: 'Dedicated courier, kitchen priority.' },
      pickup: { label: 'Pickup', eta: 'Ready in 15 min', description: 'Collect it at the counter, no fee.' },
    },
    ingredientTypes: { base: 'Crusts', sauce: 'Sauces', cheese: 'Cheeses', veggie: 'Vegetables' },
    ingredientType: { base: 'Crust', sauce: 'Sauce', cheese: 'Cheese', veggie: 'Vegetable' },
    units: { kg: 'kg', g: 'g', L: 'L', pièces: 'pcs' },
    system: 'System',
    customer: 'Customer',
    customPizza: 'Custom pizza',
    myPizza: 'My pizza',
  },
});
