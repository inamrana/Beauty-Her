export const Colors = {
  // Brand
  primary: '#C88F74',
  primaryLight: '#D9A88F',
  primaryDark: '#A87060',

  // Surfaces
  secondary: '#F8E7E6',
  accent: '#E8CFA7',
  accentDark: '#C8A870',
  background: '#FFFAF9',
  surface: '#FFFFFF',
  surfaceSecondary: '#FFF5F4',
  surfaceTinted: 'rgba(200, 143, 116, 0.06)',

  // Text
  text: '#222222',
  textSecondary: '#666666',
  textLight: '#AAAAAA',
  textInverse: '#FFFFFF',

  // UI
  border: '#F0E0DC',
  borderLight: 'rgba(200, 143, 116, 0.15)',
  inputBg: 'rgba(248, 231, 230, 0.5)',

  // Semantic
  success: '#7BC67A',
  successLight: 'rgba(123, 198, 122, 0.12)',
  warning: '#F5A623',
  warningLight: 'rgba(245, 166, 35, 0.12)',
  error: '#E05C5C',
  errorLight: 'rgba(224, 92, 92, 0.12)',

  // Glass
  glassBackground: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(200, 143, 116, 0.22)',
  overlay: 'rgba(34, 34, 34, 0.5)',
  overlayLight: 'rgba(34, 34, 34, 0.25)',
};

export const Fonts = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 38,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#C88F74',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#C88F74',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: '#C88F74',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
};
