'use client';

import Link from 'next/link';
import { Box, Card, Chip, IconButton, Rating, Tooltip, Typography } from '@mui/material';
import AddShoppingCartRounded from '@mui/icons-material/AddShoppingCartRounded';
import FavoriteRounded from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { motion } from 'framer-motion';
import { PizzaImage } from '@/components/ui';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { attempt, notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import type { Pizza } from '@/types';

export function PizzaBadges({ pizza }: { pizza: Pizza }) {
  const discount = pizza.oldPrice ? Math.round((1 - pizza.price / pizza.oldPrice) * 100) : 0;
  const t = useMessages('catalog');
  return (
    <>
      {discount > 0 && <Chip size="small" color="primary" label={`-${discount}%`} />}
      {pizza.isPopular && <Chip size="small" color="secondary" label={t.popular} />}
      {pizza.isNew && <Chip size="small" className="bg-charcoal-800 text-white" label={t.isNew} />}
      {pizza.isVegetarian && <Chip size="small" color="success" label={t.vegetarian} />}
      {pizza.isSpicy && <Chip size="small" className="bg-tomato-700 text-white" label={t.spicy} />}
    </>
  );
}

export function FavoriteButton({ pizza, className }: { pizza: Pizza; className?: string }) {
  const favorites = useAuthStore((s) => s.favorites);
  const toggle = useAuthStore((s) => s.toggleFavorite);
  const signedIn = useAuthStore((s) => s.user?.role === 'client');
  const active = favorites.includes(pizza.id);
  const t = useMessages('catalog');
  return (
    <Tooltip title={active ? t.removeFavorite : t.addFavorite}>
      <IconButton
        aria-pressed={active}
        aria-label={active ? t.removeFavoriteOf(pizza.name) : t.addFavoriteOf(pizza.name)}
        onClick={(e) => {
          e.preventDefault();
          if (!signedIn) {
            notify(t.signInForFavorites, 'info', { label: t.signIn, href: ROUTES.login });
            return;
          }
          void attempt(toggle(pizza.id), active ? t.favoriteRemoved : t.favoriteAdded, 'info');
        }}
        className={className}
      >
        <motion.span key={String(active)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex">
          {active ? <FavoriteRounded className="text-tomato-500" /> : <FavoriteBorderRounded />}
        </motion.span>
      </IconButton>
    </Tooltip>
  );
}

export function PizzaCard({ pizza, priority }: { pizza: Pizza; priority?: boolean }) {
  const addItem = useCartStore((s) => s.addItem);
  const category = useDataStore((s) => s.categories.find((c) => c.id === pizza.categoryId));
  const showRatings = useDataStore((s) => s.settings.showRatings);
  const t = useMessages('catalog');
  const fmt = useFormat();

  const quickAdd = () => {
    addItem({ pizzaId: pizza.id, name: pizza.name, image: pizza.image, size: 'medium', quantity: 1, unitPrice: pizza.price });
    notify(t.addedToCart(pizza.name), 'success', { label: t.view, href: ROUTES.cart });
  };

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="h-full">
      <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-warm">
        <Box component={Link} href={ROUTES.pizza(pizza.slug)} className="relative block aspect-[4/3] overflow-hidden" aria-label={t.viewPizza(pizza.name)}>
          <PizzaImage
            src={pizza.image}
            alt={pizza.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <Box className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <Box className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <PizzaBadges pizza={pizza} />
          </Box>
          <Box className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-charcoal-800">
            <ScheduleRounded sx={{ fontSize: 14 }} /> {pizza.prepMinutes} min
          </Box>
        </Box>
        <FavoriteButton pizza={pizza} className="absolute right-3 top-3 bg-white/90 hover:bg-white" />
        <Box className="flex flex-1 flex-col p-5">
          <Typography variant="caption" color="secondary.dark" fontWeight={700} className="uppercase tracking-wider">
            {category?.name}
          </Typography>
          <Typography variant="h6" component={Link} href={ROUTES.pizza(pizza.slug)} className="mt-0.5 text-inherit no-underline hover:text-tomato-500">
            {pizza.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mt-1 line-clamp-2">
            {pizza.description}
          </Typography>
          {showRatings && (
            <Box className="mt-2 flex items-center gap-1.5">
              <Rating value={pizza.rating} precision={0.1} readOnly size="small" />
              <Typography variant="caption" color="text.secondary">
                {pizza.rating.toFixed(1)} ({pizza.reviewCount})
              </Typography>
            </Box>
          )}
          <Box className="mt-auto flex items-end justify-between pt-4">
            <Box>
              {pizza.oldPrice && (
                <Typography variant="caption" color="text.secondary" className="block line-through">
                  {fmt.price(pizza.oldPrice)}
                </Typography>
              )}
              <Typography variant="h6" color="primary" fontWeight={800} className="leading-none">
                {fmt.price(pizza.price)}
              </Typography>
            </Box>
            <Tooltip title={t.quickAdd}>
              <motion.div whileTap={{ scale: 0.88 }}>
                <IconButton onClick={quickAdd} aria-label={t.addToCartOf(pizza.name)} className="bg-tomato-500 text-white shadow-warm hover:bg-tomato-600">
                  <AddShoppingCartRounded />
                </IconButton>
              </motion.div>
            </Tooltip>
          </Box>
        </Box>
      </Card>
    </motion.div>
  );
}
