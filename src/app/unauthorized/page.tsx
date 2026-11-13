'use client';

import GppBadRounded from '@mui/icons-material/GppBadRounded';
import { StatusPage } from '@/components/layout/StatusPage';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/authStore';
import { useMessages } from '@/i18n/client';

export default function UnauthorizedPage() {
  const user = useAuthStore((s) => s.user);
  const t = useMessages('common');
  return (
    <StatusPage
      code="403"
      icon={<GppBadRounded />}
      title={t.forbiddenTitle}
      description={user ? t.forbiddenSignedIn(user.email) : t.forbiddenGuest}
      actions={[
        { label: t.backHome, href: ROUTES.home, primary: true },
        user?.role === 'admin' ? { label: t.administration, href: ROUTES.admin.root } : { label: t.adminLogin, href: ROUTES.admin.login },
      ]}
    />
  );
}
