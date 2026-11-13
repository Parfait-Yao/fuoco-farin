'use client';

import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { tokens } from './tokens';

const displayFont = 'var(--font-display), Georgia, serif';
const sansFont = 'var(--font-sans), system-ui, -apple-system, "Segoe UI", sans-serif';

let theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: tokens.tomato, light: tokens.tomatoLight, dark: tokens.tomatoDark, contrastText: '#fff' },
    secondary: { main: tokens.ember, light: tokens.emberLight, dark: tokens.emberDark, contrastText: '#fff' },
    success: { main: tokens.basil, contrastText: '#fff' },
    warning: { main: '#E0A100' },
    error: { main: '#C62828' },
    background: { default: tokens.cream, paper: tokens.offWhite },
    text: { primary: tokens.charcoal, secondary: tokens.charcoalSoft },
    divider: tokens.border,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: sansFont,
    h1: { fontFamily: displayFont, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05 },
    h2: { fontFamily: displayFont, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 },
    h3: { fontFamily: displayFont, fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontFamily: displayFont, fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: '0.18em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 22, paddingBlock: 10 },
        sizeLarge: { paddingInline: 30, paddingBlock: 13, fontSize: '1rem' },
        sizeSmall: { paddingInline: 14, paddingBlock: 5 },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${tokens.tomatoLight} 0%, ${tokens.tomato} 55%, ${tokens.tomatoDark} 100%)`,
          boxShadow: `0 10px 24px -12px ${alpha(tokens.tomato, 0.8)}`,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 22,
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.offWhite,
          boxShadow: '0 10px 30px -18px rgba(31, 28, 26, 0.25)',
        },
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 18 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999 } } },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#fff',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(tokens.tomato, 0.5) },
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: { tooltip: { backgroundColor: tokens.charcoal, fontSize: 12.5, borderRadius: 8 } },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
    MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
    MuiLink: { defaultProps: { underline: 'hover' } },
  },
});

theme = responsiveFontSizes(theme, { factor: 2.6 });

export default theme;
