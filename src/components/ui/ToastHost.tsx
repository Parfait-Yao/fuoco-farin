'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, Button, Snackbar } from '@mui/material';
import { motion } from 'framer-motion';
import { useUiStore } from '@/store/uiStore';

/** Renders the global toast queue one notification at a time. */
export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismiss);
  const current = toasts[0];
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (current) setOpen(true);
  }, [current]);

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  return (
    <Snackbar
      key={current?.id}
      open={open && Boolean(current)}
      autoHideDuration={3800}
      onClose={handleClose}
      TransitionProps={{ onExited: () => current && dismiss(current.id) }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {current ? (
        <motion.div initial={{ y: 40, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }}>
        <Alert
          variant="filled"
          severity={current.severity}
          onClose={handleClose}
          sx={{ borderRadius: 3, alignItems: 'center', boxShadow: 6, minWidth: { sm: 360 } }}
          action={
            current.action ? (
              <Button component={Link} href={current.action.href} color="inherit" size="small" onClick={() => handleClose()}>
                {current.action.label}
              </Button>
            ) : undefined
          }
        >
          {current.message}
        </Alert>
        </motion.div>
      ) : undefined}
    </Snackbar>
  );
}
