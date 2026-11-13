import type { Metadata } from 'next';
import { Typography } from '@mui/material';
import { CartPageView } from '@/features/cart/CartPageView';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.cart };
}

export default function CartPage() {
  return (
    <div className="container-page py-8 md:py-12">
      <Typography variant="h3" component="h1" className="mb-8">
        {getMessages('site').cartTitle}
      </Typography>
      <CartPageView />
    </div>
  );
}
