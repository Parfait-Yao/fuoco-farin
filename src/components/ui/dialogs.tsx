'use client';

import * as React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography, useMediaQuery, useTheme, type DialogProps } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { LoadingButton } from './form';
import { MotionPaper } from './MotionPaper';
import { useMessages } from '@/i18n/client';

interface AppDialogProps extends Omit<DialogProps, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
}

/** Dialog that becomes full-screen on phones. */
export function AppDialog({ title, subtitle, actions, children, onClose, maxWidth = 'sm', ...props }: AppDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = React.useId();
  const t = useMessages('common');
  return (
    <Dialog {...props} PaperComponent={MotionPaper} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth={maxWidth} aria-labelledby={titleId}>
      <DialogTitle id={titleId} component="div" className="flex items-start justify-between gap-4 pr-3">
        <Box>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton aria-label={t.close} onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions className="px-6 py-4">{actions}</DialogActions>}
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, loading, onConfirm, onClose }: ConfirmDialogProps) {
  const t = useMessages('common');
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-title" PaperComponent={MotionPaper}>
      <DialogContent className="pt-6 text-center">
        <Box className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${danger ? 'bg-tomato-50 text-tomato-500' : 'bg-ember-50 text-ember-600'}`}>
          <WarningAmberRounded />
        </Box>
        <Typography id="confirm-title" variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary" component="div">{message}</Typography>
      </DialogContent>
      <DialogActions className="justify-center gap-2 px-6 pb-6">
        <Button onClick={onClose} variant="outlined" color="inherit">
          {t.cancel}
        </Button>
        <LoadingButton loading={loading} onClick={onConfirm} variant="contained" color={danger ? 'error' : 'primary'} autoFocus>
          {confirmLabel ?? t.confirm}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

/** Small helper to drive a ConfirmDialog for a given target. */
export function useConfirm<T>() {
  const [target, setTarget] = React.useState<T | null>(null);
  return { target, open: target !== null, ask: setTarget, close: () => setTarget(null) };
}
