import type { Config } from 'tailwindcss';

/**
 * Tailwind complements MUI: layout, spacing and a few decorative utilities.
 * Colors mirror the MUI palette defined in src/theme/tokens.ts so both
 * systems stay consistent.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  important: '#__app',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        tomato: {
          50: '#FDF2EF',
          100: '#FBE1DA',
          200: '#F6BFB0',
          300: '#EE9179',
          400: '#E2603F',
          500: '#C8341C',
          600: '#A82814',
          700: '#861F11',
          800: '#64170D',
          900: '#420F08',
        },
        ember: {
          50: '#FFF6EC',
          100: '#FFE8CC',
          300: '#FFBE73',
          500: '#F28C28',
          600: '#D9731A',
          700: '#B05A12',
        },
        cream: {
          50: '#FFFDF8',
          100: '#FBF6EC',
          200: '#F4EBDA',
          300: '#E9DBC1',
        },
        charcoal: {
          500: '#4A4542',
          700: '#2A2624',
          800: '#1F1C1A',
          900: '#161412',
        },
        basil: { 50: '#EEF8F0', 500: '#2E8B57', 700: '#1F6B41' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(42, 38, 36, 0.18)',
        warm: '0 24px 48px -20px rgba(200, 52, 28, 0.35)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};

export default config;
