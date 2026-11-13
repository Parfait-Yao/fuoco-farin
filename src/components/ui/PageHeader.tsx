'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Breadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { useMessages } from '@/i18n/client';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

/** Header used inside dashboard spaces (client and admin). */
export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  const t = useMessages('common');
  return (
    <Box className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <Box className="min-w-0">
        {breadcrumbs && (
          <Breadcrumbs aria-label={t.breadcrumb} className="mb-1 text-sm">
            {breadcrumbs.map((crumb) =>
              crumb.href ? (
                <MuiLink key={crumb.label} component={Link} href={crumb.href} color="inherit">
                  {crumb.label}
                </MuiLink>
              ) : (
                <Typography key={crumb.label} color="text.primary" fontSize="inherit">
                  {crumb.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" className="mt-1">
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box className="flex flex-wrap gap-2">{actions}</Box>}
    </Box>
  );
}
