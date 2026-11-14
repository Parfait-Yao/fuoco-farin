'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppBar, Avatar, Badge, Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Tooltip } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import LocalPizzaRounded from '@mui/icons-material/LocalPizzaRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import StarsRounded from '@mui/icons-material/StarsRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { LanguageSwitcher, Logo } from '@/components/ui';
import { useMessages } from '@/i18n/client';
import { AccountMenu } from './AccountMenu';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/authStore';
import { selectCartCount, useCartStore } from '@/store/cartStore';
import { authService } from '@/services';
import { notify } from '@/store/uiStore';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV = [
  { key: 'menu', href: ROUTES.menu, icon: <LocalPizzaRounded /> },
  { key: 'builder', href: ROUTES.builder, icon: <TuneRounded /> },
  { key: 'advantages', href: ROUTES.advantages, icon: <StarsRounded /> },
  { key: 'about', href: ROUTES.about, icon: <InfoOutlined /> },
  { key: 'contact', href: ROUTES.contact, icon: <MailOutlineRounded /> },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const count = useCartStore(selectCartCount);
  const openCart = useCartStore((s) => s.setDrawerOpen);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [scrolled, setScrolled] = React.useState(false);
  const t = useMessages('common');
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const spaceHref = user?.role === 'admin' ? ROUTES.admin.root : ROUTES.account.root;

  const logout = () => {
    setAnchor(null);
    authService.logout();
    notify(t.loggedOut, 'info');
    router.push(ROUTES.home);
  };

  return (
    <>
      <AppBar
        position="sticky"
        className={cn('transition-all duration-300', scrolled ? 'bg-cream-50/90 shadow-soft backdrop-blur-md' : 'bg-transparent')}
        sx={{ backgroundColor: 'transparent' }}
      >
        <Toolbar className="container-page min-h-[72px] gap-2">
          <Logo />
          <Box component="nav" aria-label={t.mainNav} className="mx-auto hidden items-center gap-1 xl:flex">
            {NAV.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                color="inherit"
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn('relative whitespace-nowrap px-3 font-semibold xl:px-4', isActive(item.href) ? 'text-tomato-500' : 'text-charcoal-700')}
              >
                {t.nav[item.key]}
                {isActive(item.href) && <motion.span layoutId="nav-underline" className="absolute bottom-1 left-3 right-3 h-0.5 xl:left-4 xl:right-4 rounded-full bg-tomato-500" />}
              </Button>
            ))}
          </Box>
          <Box className="ml-auto flex items-center gap-1 xl:ml-0">
            <Box className="hidden sm:block">
              <LanguageSwitcher />
            </Box>
            <Tooltip title={t.myCart}>
              <IconButton aria-label={t.openCart(count)} onClick={() => openCart(true)}>
                <Badge badgeContent={count} color="primary" max={99}>
                  <motion.span key={count} initial={{ scale: 1 }} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.35 }} className="flex">
                    <ShoppingBagOutlined />
                  </motion.span>
                </Badge>
              </IconButton>
            </Tooltip>
            {user ? (
              <>
                <Tooltip title={t.myAccount}>
                  <IconButton aria-label={t.accountMenu} aria-haspopup="menu" onClick={(e) => setAnchor(e.currentTarget)}>
                    <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
                      {initials(user.firstName, user.lastName)}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <AccountMenu user={user} anchorEl={anchor} onClose={() => setAnchor(null)} onLogout={logout} />
              </>
            ) : (
              <Button component={Link} href={ROUTES.login} variant="outlined" color="inherit" startIcon={<PersonOutlineRounded />} className="hidden border-black/15 sm:inline-flex">
                {t.login}
              </Button>
            )}
            <Button component={Link} href={ROUTES.menu} variant="contained" className="hidden md:inline-flex">
              {t.order}
            </Button>
            <IconButton aria-label={t.openMenu} className="xl:hidden" onClick={() => setMobileOpen(true)}>
              <MenuRounded />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ className: 'w-[86vw] max-w-sm bg-cream-50' }}>
        <Box className="flex items-center justify-between p-4">
          <Logo />
          <IconButton aria-label={t.closeMenu} onClick={() => setMobileOpen(false)}>
            <CloseRounded />
          </IconButton>
        </Box>
        <Divider />
        <List component="nav" aria-label={t.mobileNav} className="px-2">
          {[...NAV, { key: 'faq' as const, href: ROUTES.faq, icon: <HelpOutlineRounded /> }].map((item, i) => (
            <motion.div key={item.href} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
              <ListItemButton component={Link} href={item.href} selected={isActive(item.href)} className="rounded-xl">
                <ListItemIcon className={isActive(item.href) ? 'text-tomato-500' : ''}>{item.icon}</ListItemIcon>
                <ListItemText primary={t.nav[item.key]} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </motion.div>
          ))}
        </List>
        <Box className="mt-auto space-y-2 p-4">
          <LanguageSwitcher fullWidth />
          {user ? (
            <>
              <Button fullWidth component={Link} href={spaceHref} variant="outlined" color="inherit">
                {user.role === 'admin' ? t.administration : t.mySpace}
              </Button>
              <Button fullWidth onClick={logout} color="inherit" startIcon={<LogoutRounded />}>
                {t.logout}
              </Button>
            </>
          ) : (
            <>
              <Button fullWidth component={Link} href={ROUTES.login} variant="outlined" color="inherit">
                {t.login}
              </Button>
              <Button fullWidth component={Link} href={ROUTES.register} color="inherit">
                {t.register}
              </Button>
            </>
          )}
          <Button fullWidth component={Link} href={ROUTES.menu} variant="contained" size="large">
            {t.orderNow}
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
