'use client';

import * as React from 'react';
import { Box, Card, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { ConfirmDialog, LoadingButton } from '@/components/ui';
import { useDataStore } from '@/store/dataStore';
import { attempt } from '@/store/uiStore';
import { useFormat, useMessages } from '@/i18n/client';
import type { Order } from '@/types';

/**
 * Shown to the customer while the order is out for delivery. The customer
 * who receives the order is the one who marks it delivered; the admin sees
 * the change live.
 */
export function ConfirmReceiptCard({ order }: { order: Order }) {
  const confirmReceipt = useDataStore((s) => s.confirmReceipt);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const t = useMessages('account');
  const fmt = useFormat();

  if (order.status !== 'delivering') return null;

  return (
    <Card className="border-2 border-solid border-basil-300 p-5">
      <Typography fontWeight={800}>{t.receivedQuestion}</Typography>
      <Typography variant="body2" color="text.secondary" className="mb-3 mt-1">
        {order.paymentMethod === 'cash' && order.paymentStatus !== 'paid' ? t.receivedHintCash(fmt.price(order.total)) : t.receivedHint}
      </Typography>
      <Box>
        <LoadingButton fullWidth variant="contained" color="success" startIcon={<CheckCircleRounded />} loading={busy} onClick={() => setOpen(true)}>
          {t.confirmReceived}
        </LoadingButton>
      </Box>
      <ConfirmDialog
        open={open}
        title={t.confirmReceivedTitle}
        message={t.confirmReceivedText}
        confirmLabel={t.confirmReceived}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setOpen(false);
          setBusy(true);
          await attempt(confirmReceipt(order.id), t.receivedConfirmed);
          setBusy(false);
        }}
      />
    </Card>
  );
}
