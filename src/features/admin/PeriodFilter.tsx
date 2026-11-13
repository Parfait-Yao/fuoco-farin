'use client';

import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { Period } from './analytics';
import { useMessages } from '@/i18n/client';

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useMessages('admin');
  return (
    <ToggleButtonGroup exclusive size="small" value={value} onChange={(_, v: Period | null) => v && onChange(v)} aria-label={t.period} color="primary" className="bg-white">
      <ToggleButton value={7} className="px-4 normal-case">
        {t.days(7)}
      </ToggleButton>
      <ToggleButton value={30} className="px-4 normal-case">
        {t.days(30)}
      </ToggleButton>
      <ToggleButton value={90} className="px-4 normal-case">
        {t.days(90)}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
