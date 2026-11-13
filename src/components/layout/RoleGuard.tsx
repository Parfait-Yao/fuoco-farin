'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { useHydrated } from '@/hooks';
import { ROUTES } from '@/constants';
import type { Role } from '@/types';
import { useMessages } from '@/i18n/client';

/**
 * UX guard for the dashboards. Real protection is server-side: the
 * middleware blocks /account and /admin pages, and every API route checks
 * the role from the database. Once allowed, loads the space's data.
 */
export function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const allowed = user?.role === role;
  const t = useMessages('common');

  React.useEffect(() => {
    if (!hydrated || allowed) return;
    if (!user) {
      const login = role === 'admin' ? ROUTES.admin.login : ROUTES.login;
      router.replace(`${login}?redirect=${encodeURIComponent(pathname)}`);
    } else {
      router.replace(ROUTES.unauthorized);
    }
  }, [hydrated, allowed, user, role, router, pathname]);

  React.useEffect(() => {
    if (!hydrated || !allowed) return;
    const load = role === 'admin' ? useDataStore.getState().loadAdmin : useDataStore.getState().loadClient;
    load().catch((e: Error) => notify(e.message, 'error'));
  }, [hydrated, allowed, role]);

  if (!hydrated || !allowed) {
    return (
      <Box className="grid min-h-screen place-items-center" role="status" aria-label={t.checkingAccess}>
        <CircularProgress />
      </Box>
    );
  }
  return <>{children}</>;
}
