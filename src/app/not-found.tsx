'use client';

import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import { StatusPage } from '@/components/layout/StatusPage';
import { ROUTES } from '@/constants';
import { useMessages } from '@/i18n/client';

export default function NotFound() {
  const t = useMessages('common');
  return (
    <StatusPage
      code="404"
      icon={<LocalPizzaRounded />}
      title={t.notFoundTitle}
      description={t.notFoundText}
      actions={[
        { label: t.backHome, href: ROUTES.home, primary: true },
        { label: t.seeMenu, href: ROUTES.menu },
      ]}
    />
  );
}
