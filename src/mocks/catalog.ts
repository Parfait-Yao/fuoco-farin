import type { IngredientType, StockUnit } from '@/types';
import { IMAGES } from './images';

/*
 * Seed catalog (prisma/seed.ts and scripts/switch-to-usd.ts).
 * Prices are US cents. Each text has a French and an English version.
 */

const P = IMAGES.pizzas;

type Bilingual = { fr: string; en: string };

export interface CategorySeed {
  id: string;
  slug: string;
  name: Bilingual;
  description: Bilingual;
  image: string;
  order: number;
}

export const categoriesMock: CategorySeed[] = [
  { id: 'cat-classic', slug: 'classiques', name: { fr: 'Classiques', en: 'Classics' }, description: { fr: 'Les recettes napolitaines intemporelles.', en: 'Timeless Neapolitan recipes.' }, image: P[0], order: 1 },
  { id: 'cat-signature', slug: 'signatures', name: { fr: 'Signatures', en: 'Signatures' }, description: { fr: 'Les créations du chef, audacieuses et généreuses.', en: 'The chef’s bold and generous creations.' }, image: P[2], order: 2 },
  { id: 'cat-veggie', slug: 'vegetariennes', name: { fr: 'Végétariennes', en: 'Vegetarian' }, description: { fr: 'Légumes du marché, herbes fraîches.', en: 'Market vegetables, fresh herbs.' }, image: P[5], order: 3 },
  { id: 'cat-spicy', slug: 'pimentees', name: { fr: 'Pimentées', en: 'Spicy' }, description: { fr: 'Pour les amateurs de sensations.', en: 'For heat lovers.' }, image: P[1], order: 4 },
  { id: 'cat-white', slug: 'bases-creme', name: { fr: 'Bases crème', en: 'Cream base' }, description: { fr: 'Fromages fondants sur crème légère.', en: 'Melting cheeses on a light cream base.' }, image: P[3], order: 5 },
];

/** Recipe toppings: French name (also the stock-matching key) and English name. */
export const toppingNames: Record<string, string> = {
  'Sauce tomate': 'Tomato sauce',
  Mozzarella: 'Mozzarella',
  Basilic: 'Basil',
  'Huile d’olive': 'Olive oil',
  'Salami piquant': 'Spicy salami',
  Piment: 'Chili',
  'Miel pimenté': 'Hot honey',
  'Jambon de Parme': 'Parma ham',
  Roquette: 'Arugula',
  Parmesan: 'Parmesan',
  Burrata: 'Burrata',
  Crème: 'Cream',
  Gorgonzola: 'Gorgonzola',
  Chèvre: 'Goat cheese',
  Jambon: 'Ham',
  Champignons: 'Mushrooms',
  Origan: 'Oregano',
  Poivrons: 'Bell peppers',
  Courgettes: 'Zucchini',
  Aubergines: 'Eggplant',
  Pesto: 'Pesto',
  Ricotta: 'Ricotta',
  'Sauce épicée': 'Spicy sauce',
  Pepperoni: 'Pepperoni',
  'Crème moutarde': 'Mustard cream',
  'Poulet mariné': 'Marinated chicken',
  'Oignons confits': 'Caramelized onions',
  Olives: 'Olives',
  Épinards: 'Spinach',
  Artichauts: 'Artichokes',
  Citron: 'Lemon',
  'Crème de truffe': 'Truffle cream',
  'Bœuf suya': 'Suya beef',
  'Oignons rouges': 'Red onions',
  Coriandre: 'Cilantro',
  Anchois: 'Anchovies',
  Câpres: 'Capers',
  Ananas: 'Pineapple',
  Plantain: 'Plantain',
  'Jambon fumé': 'Smoked ham',
};

export interface PizzaSeed {
  slug: string;
  name: Bilingual;
  description: Bilingual;
  longDescription: Bilingual;
  categoryId: string;
  image: string;
  /** Medium size, in cents. */
  price: number;
  oldPrice?: number;
  /** French topping names (keys of toppingNames). */
  ingredients: string[];
  prepMinutes: number;
  calories: number;
  isPopular?: boolean;
  isNew?: boolean;
  isVegetarian?: boolean;
  isSpicy?: boolean;
}

type RawPizza = Omit<PizzaSeed, 'longDescription'>;

const raw: RawPizza[] = [
  { slug: 'margherita-reale', name: { fr: 'Margherita Reale', en: 'Margherita Reale' }, description: { fr: 'Tomate San Marzano, mozzarella fior di latte, basilic frais.', en: 'San Marzano tomato, fior di latte mozzarella, fresh basil.' }, categoryId: 'cat-classic', image: P[0], price: 1200, ingredients: ['Sauce tomate', 'Mozzarella', 'Basilic', 'Huile d’olive'], prepMinutes: 12, calories: 780, isPopular: true, isVegetarian: true },
  { slug: 'diavola-abidjan', name: { fr: 'Diavola Abidjan', en: 'Diavola Abidjan' }, description: { fr: 'Salami piquant, piment de Cayenne, mozzarella, miel pimenté.', en: 'Spicy salami, cayenne pepper, mozzarella, hot honey.' }, categoryId: 'cat-spicy', image: P[1], price: 1500, oldPrice: 1700, ingredients: ['Sauce tomate', 'Mozzarella', 'Salami piquant', 'Piment', 'Miel pimenté'], prepMinutes: 13, calories: 940, isPopular: true, isSpicy: true },
  { slug: 'parma-roquette', name: { fr: 'Parma & Roquette', en: 'Parma & Arugula' }, description: { fr: 'Jambon de Parme, roquette, copeaux de parmesan, burrata.', en: 'Parma ham, arugula, shaved parmesan, burrata.' }, categoryId: 'cat-signature', image: P[2], price: 1900, ingredients: ['Sauce tomate', 'Mozzarella', 'Jambon de Parme', 'Roquette', 'Parmesan', 'Burrata'], prepMinutes: 14, calories: 890, isPopular: true },
  { slug: 'quattro-formaggi', name: { fr: 'Quattro Formaggi', en: 'Quattro Formaggi' }, description: { fr: 'Mozzarella, gorgonzola, parmesan et chèvre sur crème légère.', en: 'Mozzarella, gorgonzola, parmesan and goat cheese on light cream.' }, categoryId: 'cat-white', image: P[3], price: 1600, ingredients: ['Crème', 'Mozzarella', 'Gorgonzola', 'Parmesan', 'Chèvre'], prepMinutes: 12, calories: 1010, isVegetarian: true },
  { slug: 'reine-champignons', name: { fr: 'Reine aux Champignons', en: 'Ham & Mushroom' }, description: { fr: 'Jambon blanc, champignons de Paris rôtis, mozzarella, origan.', en: 'Ham, roasted button mushrooms, mozzarella, oregano.' }, categoryId: 'cat-classic', image: P[4], price: 1300, ingredients: ['Sauce tomate', 'Mozzarella', 'Jambon', 'Champignons', 'Origan'], prepMinutes: 12, calories: 860 },
  { slug: 'ortolana', name: { fr: 'Ortolana du Marché', en: 'Market Ortolana' }, description: { fr: 'Poivrons, courgettes, aubergines grillées, tomates cerises, pesto.', en: 'Bell peppers, zucchini, grilled eggplant, cherry tomatoes, pesto.' }, categoryId: 'cat-veggie', image: P[5], price: 1300, oldPrice: 1500, ingredients: ['Sauce tomate', 'Mozzarella', 'Poivrons', 'Courgettes', 'Aubergines', 'Pesto'], prepMinutes: 13, calories: 690, isVegetarian: true, isNew: true },
  { slug: 'calzone-fuoco', name: { fr: 'Calzone Fuoco', en: 'Calzone Fuoco' }, description: { fr: 'Chausson doré, ricotta, jambon, mozzarella, sauce tomate épicée.', en: 'Golden folded pizza, ricotta, ham, mozzarella, spicy tomato sauce.' }, categoryId: 'cat-signature', image: P[6], price: 1600, ingredients: ['Ricotta', 'Jambon', 'Mozzarella', 'Sauce épicée'], prepMinutes: 15, calories: 1050, isSpicy: true },
  { slug: 'pepperoni-classica', name: { fr: 'Pepperoni Classica', en: 'Pepperoni Classica' }, description: { fr: 'Double pepperoni croustillant, mozzarella filante, origan.', en: 'Double crispy pepperoni, stretchy mozzarella, oregano.' }, categoryId: 'cat-classic', image: P[7], price: 1400, ingredients: ['Sauce tomate', 'Mozzarella', 'Pepperoni', 'Origan'], prepMinutes: 12, calories: 980, isPopular: true },
  { slug: 'poulet-yassa', name: { fr: 'Poulet Yassa', en: 'Chicken Yassa' }, description: { fr: 'Poulet mariné au citron, oignons confits, moutarde douce, olives.', en: 'Lemon-marinated chicken, caramelized onions, mild mustard, olives.' }, categoryId: 'cat-signature', image: P[8], price: 1700, ingredients: ['Crème moutarde', 'Mozzarella', 'Poulet mariné', 'Oignons confits', 'Olives'], prepMinutes: 14, calories: 920, isNew: true, isPopular: true },
  { slug: 'verdure-burrata', name: { fr: 'Verdure & Burrata', en: 'Greens & Burrata' }, description: { fr: 'Épinards, artichauts, burrata entière, zeste de citron.', en: 'Spinach, artichokes, whole burrata, lemon zest.' }, categoryId: 'cat-veggie', image: P[9], price: 1800, ingredients: ['Crème', 'Épinards', 'Artichauts', 'Burrata', 'Citron'], prepMinutes: 13, calories: 810, isVegetarian: true },
  { slug: 'bianca-truffe', name: { fr: 'Bianca Truffe', en: 'Truffle Bianca' }, description: { fr: 'Crème de truffe, mozzarella, champignons sauvages, parmesan.', en: 'Truffle cream, mozzarella, wild mushrooms, parmesan.' }, categoryId: 'cat-white', image: P[10], price: 2200, ingredients: ['Crème de truffe', 'Mozzarella', 'Champignons', 'Parmesan'], prepMinutes: 14, calories: 930, isVegetarian: true },
  { slug: 'suya-pimentee', name: { fr: 'Suya Pimentée', en: 'Spicy Suya' }, description: { fr: 'Bœuf suya, piment yaji, oignons rouges, poivrons, coriandre.', en: 'Suya beef, yaji spice, red onions, bell peppers, cilantro.' }, categoryId: 'cat-spicy', image: P[11], price: 1700, ingredients: ['Sauce tomate', 'Mozzarella', 'Bœuf suya', 'Oignons rouges', 'Poivrons', 'Coriandre'], prepMinutes: 14, calories: 990, isSpicy: true, isNew: true },
  { slug: 'napoli', name: { fr: 'Napoli', en: 'Napoli' }, description: { fr: 'Anchois, câpres, olives noires, tomate et origan.', en: 'Anchovies, capers, black olives, tomato and oregano.' }, categoryId: 'cat-classic', image: P[0], price: 1300, ingredients: ['Sauce tomate', 'Mozzarella', 'Anchois', 'Câpres', 'Olives'], prepMinutes: 12, calories: 820 },
  { slug: 'tropicale-alloco', name: { fr: 'Tropicale Alloco', en: 'Tropical Alloco' }, description: { fr: 'Ananas rôti, plantain caramélisé, jambon fumé, mozzarella.', en: 'Roasted pineapple, caramelized plantain, smoked ham, mozzarella.' }, categoryId: 'cat-signature', image: P[7], price: 1600, oldPrice: 1800, ingredients: ['Sauce tomate', 'Mozzarella', 'Ananas', 'Plantain', 'Jambon fumé'], prepMinutes: 13, calories: 960 },
];

export const pizzasMock: PizzaSeed[] = raw.map((p) => ({
  ...p,
  longDescription: {
    fr: `${p.description.fr} Pâte au levain maturée 48 heures, étalée à la main et cuite à 450 °C dans notre four à bois. Une croûte légère, alvéolée et légèrement fumée.`,
    en: `${p.description.en} Sourdough matured for 48 hours, hand-stretched and baked at 840 °F in our wood-fired oven. A light, airy and slightly smoky crust.`,
  },
}));

export interface IngredientSeed {
  id: string;
  type: IngredientType;
  name: Bilingual;
  description: Bilingual;
  /** Builder extra, in cents. */
  price: number;
  color: string;
  unit: StockUnit;
  stock: number;
  threshold: number;
}

const ing = (type: IngredientType, id: string, name: Bilingual, description: Bilingual, price: number, color: string, unit: StockUnit, stock: number, threshold: number): IngredientSeed => ({
  id,
  type,
  name,
  description,
  price,
  color,
  unit,
  stock,
  threshold,
});

export const ingredientsMock: IngredientSeed[] = [
  ing('base', 'base-classic', { fr: 'Pâte napolitaine', en: 'Neapolitan crust' }, { fr: 'Levain 48 h, bords gonflés', en: '48 h sourdough, puffy edges' }, 0, '#E9B872', 'kg', 42, 15),
  ing('base', 'base-thin', { fr: 'Pâte fine croustillante', en: 'Thin & crispy crust' }, { fr: 'Fine et craquante façon romaine', en: 'Thin and crunchy, Roman style' }, 0, '#F0C987', 'kg', 30, 12),
  ing('base', 'base-whole', { fr: 'Pâte complète', en: 'Whole wheat crust' }, { fr: 'Farine complète et graines', en: 'Whole wheat flour and seeds' }, 100, '#C79A5B', 'kg', 9, 10),
  ing('base', 'base-gluten', { fr: 'Sans gluten', en: 'Gluten-free' }, { fr: 'Riz, maïs et sarrasin', en: 'Rice, corn and buckwheat' }, 200, '#E5C590', 'kg', 6, 5),
  ing('base', 'base-stuffed', { fr: 'Bords farcis fromage', en: 'Cheese-stuffed crust' }, { fr: 'Bords garnis de mozzarella', en: 'Edges filled with mozzarella' }, 250, '#DDAA5E', 'kg', 18, 8),
  ing('sauce', 'sauce-tomato', { fr: 'Tomate San Marzano', en: 'San Marzano tomato' }, { fr: 'Douce et parfumée', en: 'Sweet and fragrant' }, 0, '#C8341C', 'L', 25, 10),
  ing('sauce', 'sauce-cream', { fr: 'Crème fraîche', en: 'Crème fraîche' }, { fr: 'Onctueuse et légère', en: 'Smooth and light' }, 75, '#F3E6CB', 'L', 14, 6),
  ing('sauce', 'sauce-bbq', { fr: 'Barbecue fumée', en: 'Smoky barbecue' }, { fr: 'Notes sucrées et fumées', en: 'Sweet and smoky notes' }, 75, '#6B2A14', 'L', 4, 6),
  ing('sauce', 'sauce-pesto', { fr: 'Pesto basilic', en: 'Basil pesto' }, { fr: 'Basilic, pignons, parmesan', en: 'Basil, pine nuts, parmesan' }, 100, '#5E8C31', 'L', 8, 4),
  ing('sauce', 'sauce-spicy', { fr: 'Tomate pimentée', en: 'Spicy tomato' }, { fr: 'Piment frais et ail', en: 'Fresh chili and garlic' }, 50, '#E0442A', 'L', 11, 5),
  ing('cheese', 'cheese-mozza', { fr: 'Mozzarella', en: 'Mozzarella' }, { fr: 'Fior di latte filante', en: 'Stretchy fior di latte' }, 0, '#FFF3D1', 'kg', 35, 12),
  ing('cheese', 'cheese-cheddar', { fr: 'Cheddar affiné', en: 'Aged cheddar' }, { fr: 'Goût prononcé', en: 'Bold flavor' }, 100, '#F2A93B', 'kg', 12, 6),
  ing('cheese', 'cheese-goat', { fr: 'Chèvre', en: 'Goat cheese' }, { fr: 'Doux et crémeux', en: 'Mild and creamy' }, 125, '#FBF8F0', 'kg', 3, 5),
  ing('cheese', 'cheese-gorgonzola', { fr: 'Gorgonzola', en: 'Gorgonzola' }, { fr: 'Persillé et fondant', en: 'Blue-veined and melting' }, 150, '#E5E0BE', 'kg', 7, 4),
  ing('cheese', 'cheese-none', { fr: 'Sans fromage', en: 'No cheese' }, { fr: 'Version plus légère', en: 'A lighter option' }, 0, 'transparent', 'kg', 999, 0),
  ing('veggie', 'veg-mushroom', { fr: 'Champignons', en: 'Mushrooms' }, { fr: 'Rôtis au thym', en: 'Roasted with thyme' }, 75, '#A47E5B', 'kg', 16, 6),
  ing('veggie', 'veg-pepper', { fr: 'Poivrons', en: 'Bell peppers' }, { fr: 'Rouges et verts', en: 'Red and green' }, 75, '#3E9B4F', 'kg', 13, 6),
  ing('veggie', 'veg-onion', { fr: 'Oignons rouges', en: 'Red onions' }, { fr: 'Émincés finement', en: 'Thinly sliced' }, 50, '#9C3B6E', 'kg', 20, 6),
  ing('veggie', 'veg-olive', { fr: 'Olives noires', en: 'Black olives' }, { fr: 'Dénoyautées', en: 'Pitted' }, 75, '#2B2523', 'kg', 9, 4),
  ing('veggie', 'veg-tomato', { fr: 'Tomates cerises', en: 'Cherry tomatoes' }, { fr: 'Confites au four', en: 'Oven-roasted' }, 75, '#E2442F', 'kg', 2, 5),
  ing('veggie', 'veg-spinach', { fr: 'Épinards', en: 'Spinach' }, { fr: 'Jeunes pousses', en: 'Baby leaves' }, 75, '#2F6B35', 'kg', 7, 4),
  ing('veggie', 'veg-corn', { fr: 'Maïs doux', en: 'Sweet corn' }, { fr: 'Grains dorés', en: 'Golden kernels' }, 50, '#F5C842', 'kg', 15, 5),
  ing('veggie', 'veg-plantain', { fr: 'Plantain', en: 'Plantain' }, { fr: 'Caramélisé', en: 'Caramelized' }, 100, '#E8A43A', 'kg', 11, 5),
];

/** Seed promotions (amounts in cents). */
export const promotionsMock = [
  { code: 'BIENVENUE10', label: { fr: '10 % sur la première commande', en: '10% off your first order' }, kind: 'PERCENT' as const, value: 10, minOrder: 1500, days: 365, maxUsesPerUser: 1 },
  { code: 'FUOCO5', label: { fr: '5 $ offerts dès 40 $', en: '$5 off orders of $40+' }, kind: 'FIXED' as const, value: 500, minOrder: 4000, days: 30 },
  { code: 'WEEKEND20', label: { fr: '20 % le week-end', en: '20% off on weekends' }, kind: 'PERCENT' as const, value: 20, minOrder: 3000, days: 25 },
];

/** Restaurant settings row (amounts in cents). */
export const settingsSeed = {
  name: 'Fuoco & Farina',
  slogan: 'Pizzas au feu de bois, livrées brûlantes à Abidjan.',
  sloganEn: 'Wood-fired pizzas, delivered piping hot in Abidjan.',
  email: 'bonjour@fuoco-farina.ci',
  phone: '+225 07 07 25 25 25',
  address: 'Rue des Jardins, Cocody Riviera 2, Abidjan',
  openingHours: 'Tous les jours, 11h00 – 23h30',
  openingHoursEn: 'Every day, 11:00 AM – 11:30 PM',
  currency: 'USD',
  deliveryFee: 399,
  expressFee: 699,
  freeDeliveryFrom: 3500,
};
