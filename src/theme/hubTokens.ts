/** Identidade visual — YES7 Hub (portado de yes7one-frontend/src/theme/colors.ts). */
export const brand = {
  navy: '#1B2140',
  navySoft: '#2A3358',
  teal: '#6B46FE',
  tealSoft: '#8B6FFF',
  accent: '#6B46FE',
  purple: '#6B46FE',
  purpleSoft: '#8B6FFF',
  purpleDark: '#4C2FE0',
  blueDeep: '#1B2140',
  lime: '#22C55E',
  danger: '#E53935',
  success: '#16A34A',
  warning: '#F59E0B',
  brandGradient: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 55%, #0EA5E9 100%)',
  brandGradientSoft: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
} as const;

export type ThemeTokens = {
  mode: 'light' | 'dark';
  navy: string;
  navySoft: string;
  header: string;
  teal: string;
  tealSoft: string;
  accent: string;
  purple: string;
  purpleSoft: string;
  purpleDark: string;
  blueDeep: string;
  lime: string;
  background: string;
  card: string;
  sidebar: string;
  sidebarText: string;
  sidebarHover: string;
  sidebarActive: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  brandGradient: string;
  brandGradientSoft: string;
  appBar: string;
  brandHover: string;
};

const lightTokens: ThemeTokens = {
  mode: 'light',
  ...brand,
  header: brand.navy,
  background: '#F4F5FB',
  card: '#FFFFFF',
  sidebar: brand.navy,
  sidebarText: '#C9CEE0',
  sidebarHover: 'rgba(107,70,254,0.16)',
  sidebarActive: '#FFFFFF',
  text: '#1B2140',
  textMuted: '#6B7289',
  border: '#E6E8F0',
  appBar: '#FFFFFF',
  brandHover: 'rgba(107,70,254,0.08)',
};

const darkTokens: ThemeTokens = {
  mode: 'dark',
  ...brand,
  header: '#12162A',
  background: '#0F1324',
  card: '#1B2140',
  sidebar: '#151A33',
  sidebarText: '#C9CEE0',
  sidebarHover: 'rgba(107,70,254,0.22)',
  sidebarActive: '#FFFFFF',
  text: '#F4F5FB',
  textMuted: '#9AA3B8',
  border: 'rgba(255,255,255,0.10)',
  appBar: '#161B32',
  brandHover: 'rgba(139,111,255,0.18)',
};

export function getThemeTokens(mode: 'light' | 'dark'): ThemeTokens {
  return mode === 'dark' ? darkTokens : lightTokens;
}

/** Alias usado no shell Kaneko. */
export const hub = lightTokens;
