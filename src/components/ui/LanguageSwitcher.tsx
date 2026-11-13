'use client';

import * as React from 'react';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import PublicRounded from '@mui/icons-material/PublicRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { changeLocale, useLocale, useMessages } from '@/i18n/client';
import { LocaleFlag } from './LocaleFlag';

/** FR / EN choice. Saves the cookie (and the profile) then reloads the page. */
export function LanguageSwitcher({ light = false, fullWidth = false }: { light?: boolean; fullWidth?: boolean }) {
  const locale = useLocale();
  const t = useMessages('common');
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [pending, setPending] = React.useState(false);

  const choose = (next: Locale) => {
    setAnchor(null);
    if (next === locale) return;
    setPending(true);
    void changeLocale(next);
  };

  return (
    <>
      <Tooltip title={t.switchLanguage}>
        <Button
          color="inherit"
          size="small"
          fullWidth={fullWidth}
          startIcon={<PublicRounded fontSize="small" />}
          endIcon={<LocaleFlag locale={locale} size={18} />}
          onClick={(e) => setAnchor(e.currentTarget)}
          disabled={pending}
          aria-label={`${t.language}: ${LOCALE_LABELS[locale].name}`}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          className={light ? 'min-w-0 font-bold text-white/80' : 'min-w-0 font-bold'}
        >
          {LOCALE_LABELS[locale].short}
        </Button>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {LOCALES.map((l) => (
          <MenuItem key={l} selected={l === locale} onClick={() => choose(l)} lang={l}>
            <ListItemIcon>
              <LocaleFlag locale={l} size={22} />
            </ListItemIcon>
            <ListItemText primary={LOCALE_LABELS[l].name} />
            {l === locale ? <CheckRounded fontSize="small" color="primary" sx={{ ml: 2 }} /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
