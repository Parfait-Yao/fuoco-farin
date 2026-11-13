'use client';

import Link from 'next/link';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { motion } from 'framer-motion';
import { PizzaImage, QuantityStepper } from '@/components/ui';
import { MiniPizzaPreview } from '@/features/builder/PizzaPreview';
import { useCartStore } from '@/store/cartStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { ROUTES } from '@/constants';
import { useFormat, useMessages } from '@/i18n/client';
import type { CartItem } from '@/types';

export function CartLine({ item, compact }: { item: CartItem; compact?: boolean }) {
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const ingredients = useDataStore((s) => s.ingredients);
  const t = useMessages('cart');
  const sizes = useMessages('domain').sizes;
  const fmt = useFormat();

  const customLabel = item.custom
    ? [item.custom.baseId, item.custom.sauceId, item.custom.cheeseId, ...item.custom.veggieIds]
        .map((id) => ingredients.find((i) => i.id === id)?.name)
        .filter(Boolean)
        .join(' · ')
    : null;

  const remove = () => {
    removeItem(item.id);
    notify(t.removed(item.name), 'info');
  };

  return (
    <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40, height: 0 }} transition={{ duration: 0.25 }} className="flex gap-3 py-4">
      <Box className={`relative shrink-0 overflow-hidden rounded-2xl bg-cream-200 ${compact ? 'h-20 w-20' : 'h-24 w-24'}`}>
        {item.custom ? (
          <Box className="grid h-full w-full place-items-center p-1.5">
            <MiniPizzaPreview config={item.custom} />
          </Box>
        ) : (
          <PizzaImage src={item.image ?? ''} alt={item.name} fill sizes="96px" className="object-cover" />
        )}
      </Box>
      <Box className="min-w-0 flex-1">
        <Box className="flex items-start justify-between gap-2">
          <Box className="min-w-0">
            <Typography fontWeight={700} className="truncate">
              {item.name}
            </Typography>
            <Box className="mt-1 flex flex-wrap gap-1">
              <Chip size="small" label={`${sizes[item.size].label} · ${sizes[item.size].diameter}`} />
              {item.custom && <Chip size="small" color="secondary" variant="outlined" label={t.custom} />}
            </Box>
          </Box>
          <Box className="flex shrink-0">
            {item.custom && (
              <Tooltip title={t.editComposition}>
                <IconButton size="small" component={Link} href={`${ROUTES.builder}?edit=${item.id}`} aria-label={t.editItem(item.name)}>
                  <EditRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={t.removeFromCart}>
              <IconButton size="small" onClick={remove} aria-label={t.removeItem(item.name)}>
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {customLabel && (
          <Typography variant="caption" color="text.secondary" className="mt-1 line-clamp-2 block">
            {customLabel}
          </Typography>
        )}
        {item.removedIngredients && item.removedIngredients.length > 0 && (
          <Typography variant="caption" color="text.secondary" className="mt-1 block">
            {t.without(item.removedIngredients.join(', '))}
          </Typography>
        )}
        {item.note && (
          <Typography variant="caption" color="text.secondary" className="mt-0.5 block italic">
            “{item.note}”
          </Typography>
        )}
        <Box className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper size="small" value={item.quantity} onChange={(q) => setQuantity(item.id, q)} label={t.quantityOf(item.name)} />
          <Typography fontWeight={800} color="primary">
            {fmt.price(item.unitPrice * item.quantity)}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}
