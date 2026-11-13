'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import MenuOpenRounded from '@mui/icons-material/MenuOpenRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import KeyboardDoubleArrowLeftRounded from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';
import KeyboardDoubleArrowRightRounded from '@mui/icons-material/KeyboardDoubleArrowRightRounded';
import { motion } from 'framer-motion';
import { LanguageSwitcher, Logo } from '@/components/ui';
import { useMessages } from '@/i18n/client';
import { useAuthStore } from '@/store/authStore';
import { useDataStore } from '@/store/dataStore';
import { notify } from '@/store/uiStore';
import { authService } from '@/services';
import { ROUTES } from '@/constants';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AccountMenu } from './AccountMenu';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Match only the exact path (used for dashboard roots). */
  exact?: boolean;
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

interface DashboardShellProps {
  variant: 'client' | 'admin';
  sections: NavSection[];
  /** Items shown in the mobile bottom bar (client space). */
  bottomNav?: NavItem[];
  notificationsHref: string;
  children: React.ReactNode;
}

const WIDTH_OPEN = 272;
const WIDTH_CLOSED = 84;

/** Desktop sidebar open/closed state, remembered per space. */
function useSidebarState(variant: string) {
  const key = `fuoco-sidebar-${variant}`;
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) setOpen(saved === '1');
    } catch {}
  }, [key]);
  const toggle = React.useCallback(() => {
    setOpen((value) => {
      try {
        localStorage.setItem(key, value ? '0' : '1');
      } catch {}
      return !value;
    });
  }, [key]);
  return { open, toggle };
}

export function DashboardShell({ variant, sections, bottomNav, notificationsHref, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const notifications = useDataStore((s) => s.notifications);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const sidebar = useSidebarState(variant);
  const dark = variant === 'admin';
  const t = useMessages('common');

  const unread = React.useMemo(
    () => notifications.filter((n) => n.audience === user?.role && !n.read && (!n.userId || n.userId === user?.id)).length,
    [notifications, user],
  );

  React.useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const logout = () => {
    authService.logout();
    notify(t.logoutDone, 'info');
    router.replace(variant === 'admin' ? ROUTES.admin.login : ROUTES.home);
  };

  /** Navigation content; `collapsed` shows icons only with tooltips. */
  const renderNav = (collapsed: boolean) => (
    <Box className={cn('flex h-full flex-col', dark ? 'bg-charcoal-900 text-white' : 'bg-cream-50')}>
      <Box className={cn('flex h-[72px] shrink-0 items-center', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Logo href={variant === 'admin' ? ROUTES.admin.root : ROUTES.account.root} light={dark} subtitle={dark ? t.backOffice : t.clientSpace} compact={collapsed} />
      </Box>
      <Box component="nav" aria-label={dark ? t.adminNav : t.clientNav} className={cn('no-scrollbar flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
        {sections.map((section, si) => (
          <List
            key={si}
            dense
            subheader={
              section.title ? (
                collapsed ? (
                  <Divider className={cn('mx-3 my-2', dark ? 'border-white/10' : '')} />
                ) : (
                  <ListSubheader disableSticky className={cn('bg-transparent text-[11px] font-bold uppercase tracking-widest', dark ? 'text-white/40' : 'text-charcoal-500')}>
                    {section.title}
                  </ListSubheader>
                )
              ) : undefined
            }
          >
            {section.items.map((item) => {
              const active = isActive(item);
              const icon = item.badge ? (
                <Badge badgeContent={item.badge} color="primary" max={99}>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              );
              return (
                <Tooltip key={item.href} title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn('relative mb-0.5 rounded-xl py-2', collapsed && 'justify-center px-0', dark ? 'hover:bg-white/5' : 'hover:bg-tomato-50')}
                  >
                    {active && (
                      <motion.span layoutId={`${variant}-nav-active-${collapsed ? 'c' : 'o'}`} className={cn('absolute inset-0 rounded-xl', dark ? 'bg-white/10' : 'bg-tomato-50')} transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                    )}
                    <ListItemIcon className={cn('relative', collapsed ? 'min-w-0' : 'min-w-[40px]', active ? (dark ? 'text-ember-300' : 'text-tomato-500') : dark ? 'text-white/60' : 'text-charcoal-500')}>{icon}</ListItemIcon>
                    {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 500, className: 'relative whitespace-nowrap' }} />}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
        ))}
      </Box>
      <Divider className={dark ? 'border-white/10' : ''} />
      <Box className={cn('space-y-1', collapsed ? 'p-2' : 'p-3')}>
        <Tooltip title={collapsed ? t.viewSite : ''} placement="right">
          <ListItemButton component={Link} href={ROUTES.home} aria-label={collapsed ? t.viewSite : undefined} className={cn('rounded-xl', collapsed && 'justify-center px-0', dark ? 'text-white/70 hover:bg-white/5' : '')}>
            <ListItemIcon className={cn(collapsed ? 'min-w-0' : 'min-w-[40px]', dark ? 'text-white/60' : '')}>
              <StorefrontRounded />
            </ListItemIcon>
            {!collapsed && <ListItemText primary={t.viewSite} />}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const width = sidebar.open ? WIDTH_OPEN : WIDTH_CLOSED;

  return (
    <Box className="flex min-h-screen bg-cream-100">
      {/* Desktop: collapsible rail */}
      <motion.aside className="relative hidden shrink-0 lg:block" initial={false} animate={{ width }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
        <Box className="fixed inset-y-0 left-0 z-[1200] overflow-hidden border-0 border-r border-solid border-black/5 transition-[width] duration-300 ease-out" style={{ width }}>
          {renderNav(!sidebar.open)}
        </Box>
        <Tooltip title={sidebar.open ? t.collapseMenu : t.expandMenu} placement="right">
          <IconButton
            size="small"
            onClick={sidebar.toggle}
            aria-label={sidebar.open ? t.collapseSidebar : t.expandSidebar}
            aria-expanded={sidebar.open}
            className="fixed top-[60px] z-[1201] h-7 w-7 -translate-x-1/2 border border-solid border-black/10 bg-white shadow-soft transition-[left] duration-300 ease-out hover:bg-cream-100"
            style={{ left: width }}
          >
            {sidebar.open ? <KeyboardDoubleArrowLeftRounded fontSize="small" /> : <KeyboardDoubleArrowRightRounded fontSize="small" />}
          </IconButton>
        </Tooltip>
      </motion.aside>

      {/* Mobile: temporary drawer */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} className="lg:hidden" PaperProps={{ style: { width: WIDTH_OPEN } }}>
        {renderNav(false)}
      </Drawer>

      <Box className="flex min-w-0 flex-1 flex-col">
        <AppBar position="sticky" className="border-0 border-b border-solid border-black/5 bg-cream-50/90 backdrop-blur-md">
          <Toolbar className="min-h-[64px] gap-2 px-4 sm:px-6">
            <IconButton aria-label={t.openNav} className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <MenuRounded />
            </IconButton>
            <Tooltip title={sidebar.open ? t.closeSidebar : t.openSidebar}>
              <IconButton aria-label={sidebar.open ? t.closeSidebar : t.openSidebar} aria-expanded={sidebar.open} className="hidden lg:inline-flex" onClick={sidebar.toggle}>
                {sidebar.open ? <MenuOpenRounded /> : <MenuRounded />}
              </IconButton>
            </Tooltip>
            <Typography fontWeight={700} className="truncate">
              {dark ? t.administration : t.hello(user?.firstName ?? '')}
            </Typography>
            <Box className="ml-auto flex items-center gap-1">
              <LanguageSwitcher />
              <Tooltip title={t.notificationsTitle}>
                <IconButton component={Link} href={notificationsHref} aria-label={t.notificationsAria(unread)}>
                  <Badge badgeContent={unread} color="primary">
                    <NotificationsNoneRounded />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title={t.myAccount}>
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={t.accountMenu} aria-haspopup="menu" aria-expanded={Boolean(anchor)}>
                  <Avatar src={user?.avatar} alt={user?.firstName} sx={{ width: 36, height: 36, bgcolor: dark ? 'text.primary' : 'secondary.main', fontSize: 14 }}>
                    {user ? initials(user.firstName, user.lastName) : null}
                  </Avatar>
                </IconButton>
              </Tooltip>
              {user && <AccountMenu user={user} anchorEl={anchor} onClose={() => setAnchor(null)} onLogout={logout} />}
            </Box>
          </Toolbar>
        </AppBar>
        <Box component="main" id="main" className={cn('w-full flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8', bottomNav && 'pb-24 lg:pb-8')}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-7xl">
            {children}
          </motion.div>
        </Box>
      </Box>

      {bottomNav && (
        <Paper elevation={8} className="fixed inset-x-0 bottom-0 z-[1100] rounded-none lg:hidden">
          <BottomNavigation showLabels value={bottomNav.findIndex((i) => isActive(i))} component="nav" aria-label={t.quickNav}>
            {bottomNav.map((item) => (
              <BottomNavigationAction key={item.href} label={item.label} icon={item.icon} component={Link} href={item.href} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
