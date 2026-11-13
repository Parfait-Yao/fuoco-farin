import type { Metadata } from 'next';
import { Typography } from '@mui/material';
import { CheckoutFlow } from '@/features/checkout/CheckoutFlow';
import { getMessages } from '@/i18n/server';

export function generateMetadata(): Metadata {
  return { title: getMessages('site').meta.checkout };
}

export default function CheckoutPage() {
  return (
    <div className="container-page py-8 md:py-12">
      <Typography variant="h3" component="h1" className="mb-6">
        {getMessages('site').checkoutTitle}
      </Typography>
      <CheckoutFlow />
    </div>
  );
}
