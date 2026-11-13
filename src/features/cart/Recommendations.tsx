'use client';

import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { motion } from 'framer-motion';
import { PizzaImage } from '@/components/ui';
import { useCartStore } from '@/store/cartStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { useFormat, useMessages } from '@/i18n/client';

/** Popular pizzas not yet in the cart, addable in one tap. */
export function Recommendations({ limit = 4, title }: { limit?: number; title?: string }) {
  const t = useMessages('cart');
  const fmt = useFormat();
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const pizzas = useDataStore((s) => s.pizzas);
  const inCart = new Set(items.map((i) => i.pizzaId));
  const suggestions = pizzas.filter((p) => p.active && p.isPopular && !inCart.has(p.id)).slice(0, limit);

  if (suggestions.length === 0) return null;

  return (
    <Box>
      <Typography fontWeight={800} className="mb-3">
        {title ?? t.goTogether}
      </Typography>
      <Box className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {suggestions.map((pizza) => (
          <motion.div key={pizza.id} whileHover={{ y: -3 }} className="w-36 shrink-0 rounded-2xl border border-solid border-black/5 bg-white p-2">
            <Box className="relative h-20 overflow-hidden rounded-xl">
              <PizzaImage src={pizza.image} alt={pizza.name} fill sizes="144px" className="object-cover" />
            </Box>
            <Typography variant="body2" fontWeight={700} className="mt-1.5 truncate">
              {pizza.name}
            </Typography>
            <Box className="flex items-center justify-between">
              <Typography variant="caption" fontWeight={700} color="primary">
                {fmt.price(pizza.price)}
              </Typography>
              <Tooltip title={t.addMedium}>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label={t.addPizza(pizza.name)}
                  onClick={() => {
                    addItem({ pizzaId: pizza.id, name: pizza.name, image: pizza.image, size: 'medium', quantity: 1, unitPrice: pizza.price });
                    notify(t.added(pizza.name));
                  }}
                >
                  <AddRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
