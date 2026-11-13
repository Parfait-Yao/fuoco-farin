'use client';

import { Box, Button, Typography } from '@mui/material';
import ReportProblemRounded from '@mui/icons-material/ReportProblemRounded';
import { useMessages } from '@/i18n/client';

/** UI error boundary: catches rendering errors and offers a retry. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useMessages('common');
  return (
    <Box className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Box className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-tomato-50 text-tomato-500">
        <ReportProblemRounded fontSize="large" />
      </Box>
      <Typography variant="h3" component="h1">
        {t.crashTitle}
      </Typography>
      <Typography color="text.secondary" className="mt-2 max-w-md">
        {t.crashText}
      </Typography>
      {process.env.NODE_ENV !== 'production' && (
        <Typography variant="caption" color="error" className="mt-3 font-mono">
          {error.message}
        </Typography>
      )}
      <Box className="mt-6 flex gap-3">
        <Button variant="contained" onClick={reset}>
          {t.retry}
        </Button>
        <Button variant="outlined" href="/">
          {t.home}
        </Button>
      </Box>
    </Box>
  );
}
