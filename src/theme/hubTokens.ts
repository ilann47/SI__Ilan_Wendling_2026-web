/** Identidade de componentes do Seven Tickets Web (main 95181e4), aplicada ao Kaneko. */
export const brand = {
  navy: '#292C33',
  navySoft: '#3A3440',
  teal: '#0A717D',
  tealSoft: '#78D4DF',
  accent: '#800084',
  purple: '#800084',
  purpleSoft: '#A744AC',
  purpleDark: '#650068',
  blueDeep: '#292C33',
  lime: '#1E8653',
  danger: '#D1293D',
  success: '#1E8653',
  warning: '#906007',
  brandGradient: 'linear-gradient(135deg, #650068 0%, #800084 100%)',
  brandGradientSoft: 'linear-gradient(135deg, #800084 0%, #A744AC 100%)',
} as const;

/** Raios da referência; alturas, larguras e espaçamentos permanecem no layout existente. */
export const componentRadius = { control: 10, surface: 14, pill: 100 } as const;

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
  masthead: string;
  onMasthead: string;
  onMastheadMuted: string;
  mastheadHover: string;
  mastheadLine: string;
  panelHeader: string;
  brandHover: string;
  surfaceMuted: string;
  inputBorder: string;
  actionFill: string;
  actionHover: string;
  focusRing: string;
  disabledSurface: string;
  disabledText: string;
  overlay: string;
  raisedShadow: string;
};

const lightTokens: ThemeTokens = {
  mode: 'light',
  ...brand,
  header: brand.navy,
  background: '#F4F4F5',
  card: '#FFFFFF',
  sidebar: brand.navy,
  sidebarText: '#DFE0E5',
  sidebarHover: 'rgba(128,0,132,0.10)',
  sidebarActive: '#FFFFFF',
  text: '#292C33',
  textMuted: '#5C626D',
  border: '#DFE0E5',
  appBar: '#FFFFFF',
  masthead: brand.purple,
  onMasthead: '#FFFFFF',
  onMastheadMuted: '#F6DFF6',
  mastheadHover: 'rgba(255,255,255,0.13)',
  mastheadLine: 'rgba(255,255,255,0.36)',
  panelHeader: '#F5EDF6',
  brandHover: '#F5EDF6',
  surfaceMuted: '#F4F4F5',
  inputBorder: '#BDC0C7',
  actionFill: brand.purple,
  actionHover: brand.purpleDark,
  focusRing: brand.purple,
  disabledSurface: '#EDEDF0',
  disabledText: '#707681',
  overlay: 'rgba(20,13,22,0.26)',
  raisedShadow: '0 12px 32px rgba(41,44,51,0.12)',
};

const darkTokens: ThemeTokens = {
  mode: 'dark',
  ...brand,
  accent: '#E5ACE8',
  purple: '#E5ACE8',
  purpleSoft: '#D08AD5',
  danger: '#FF9CA7',
  success: '#84D8AA',
  warning: '#F4C56F',
  header: '#19161C',
  background: '#17151A',
  card: '#232027',
  sidebar: '#1D1A20',
  sidebarText: '#D8D3DC',
  sidebarHover: '#39243C',
  sidebarActive: '#FFFFFF',
  text: '#F5F2F6',
  textMuted: '#BBB3C0',
  border: '#3F3945',
  appBar: '#201C24',
  masthead: '#530D58',
  onMasthead: '#FFFFFF',
  onMastheadMuted: '#F6DFF6',
  mastheadHover: 'rgba(255,255,255,0.13)',
  mastheadLine: 'rgba(255,255,255,0.36)',
  panelHeader: '#36243A',
  brandHover: '#39243C',
  surfaceMuted: '#2C2730',
  inputBorder: '#746A7A',
  actionFill: '#912699',
  actionHover: '#A134A8',
  focusRing: '#E5ACE8',
  disabledSurface: '#312C35',
  disabledText: '#A49AA9',
  overlay: 'rgba(0,0,0,0.56)',
  raisedShadow: '0 12px 32px rgba(0,0,0,0.34)',
};

export function getThemeTokens(mode: 'light' | 'dark'): ThemeTokens {
  return mode === 'dark' ? darkTokens : lightTokens;
}

/** Alias usado no shell Kaneko. */
export const hub = lightTokens;
