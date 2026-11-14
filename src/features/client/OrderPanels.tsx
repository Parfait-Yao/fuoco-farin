'use client';

import * as React from 'react';
import { Box, Card, Chip, Divider, Link as MuiLink, Typography } from '@mui/material';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import { PizzaImage, mapUrl } from '@/components/ui';
import { MiniPizzaPreview } from '@/features/builder/PizzaPreview';
import { useFormat, useMessages } from '@/i18n/client';
import type { Order } from '@/types';

/** Reusable order panels shared by client and admin detail pages. */
export function OrderItemsCard({ order }: { order: Order }) {
  const t = useMessages('account');
  const sizes = useMessages('domain').sizes;
  const fmt = useFormat();
  return (
    <Card className="p-5 md:p-6">
      <Typography variant="h6" component="h2" className="mb-2">
        {t.orderedProducts}
      </Typography>
      <Box component="ul" className="m-0 list-none p-0">
        {order.items.map((item, i) => (
          <li key={item.id}>
            {i > 0 && <Divider />}
            <Box className="flex items-center gap-3 py-3">
              <Box className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-200">
                {item.custom ? <MiniPizzaPreview config={item.custom} /> : <PizzaImage src={item.image ?? ''} alt="" fill sizes="56px" className="object-cover" />}
              </Box>
              <Box className="min-w-0 flex-1">
                <Typography fontWeight={700} className="truncate">
                  {item.quantity} × {item.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sizes[item.size].label} · {t.perUnit(fmt.price(item.unitPrice))}
                  {item.removedIngredients?.length ? t.without(item.removedIngredients.join(', ')) : ''}
                </Typography>
              </Box>
              <Typography fontWeight={700}>{fmt.price(item.unitPrice * item.quantity)}</Typography>
            </Box>
          </li>
        ))}
      </Box>
      <Divider className="my-2" />
      <Box className="space-y-1 pt-2">
        <Line label={t.subtotal} value={fmt.price(order.subtotal)} />
        <Line label={t.delivery} value={order.deliveryFee ? fmt.price(order.deliveryFee) : t.free} />
        {order.discount > 0 && <Line label={t.discount(order.promoCode ?? '')} value={`- ${fmt.price(order.discount)}`} />}
        <Box className="flex justify-between pt-2">
          <Typography variant="h6">{t.total}</Typography>
          <Typography variant="h6" color="primary">
            {fmt.price(order.total)}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Box className="flex justify-between text-sm">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <Box className="mb-2 flex items-center gap-2 text-tomato-500">
        {icon}
        <Typography variant="subtitle1" fontWeight={800} color="text.primary" component="h2">
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" component="div" className="space-y-0.5">
        {children}
      </Typography>
    </Card>
  );
}

export function OrderInfoCards({ order, showCustomer }: { order: Order; showCustomer?: boolean }) {
  const paymentColor = order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'error' : order.paymentStatus === 'pending' ? 'warning' : 'default';
  const t = useMessages('account');
  const domain = useMessages('domain');
  const geo = useMessages('common').geo;
  const paymentLabel = domain.paymentStatus[order.paymentStatus];
  return (
    <Box className="grid gap-4">
      {showCustomer && (
        <InfoCard icon={<PersonRounded />} title={t.customer}>
          <div className="font-semibold text-charcoal-800">{order.customerName}</div>
          <div>{order.customerEmail}</div>
          <div>{order.customerPhone}</div>
        </InfoCard>
      )}
      <InfoCard icon={<PlaceRounded />} title={domain.delivery[order.deliveryMode].label}>
        {order.deliveryMode === 'pickup' ? (
          <div>{t.pickupAtRestaurant}</div>
        ) : (
          <>
            <div>{order.address.street}</div>
            <div>
              {order.address.district}, {order.address.city}
            </div>
            {order.address.details && <div className="italic">{order.address.details}</div>}
            {order.address.latitude !== undefined && order.address.longitude !== undefined && (
              <MuiLink href={mapUrl({ latitude: order.address.latitude, longitude: order.address.longitude })} target="_blank" rel="noopener noreferrer">
                {geo.viewOnMap}
              </MuiLink>
            )}
          </>
        )}
      </InfoCard>
      <InfoCard icon={<PaymentsRounded />} title={t.payment}>
        <Box className="flex items-center justify-between gap-2">
          <span>{domain.payment[order.paymentMethod].label}</span>
          <Chip size="small" color={paymentColor} label={paymentLabel} />
        </Box>
      </InfoCard>
    </Box>
  );
}
