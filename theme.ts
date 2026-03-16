/**
 * Shared theme colors and common UI patterns.
 * Aligned with .cursorrules design system and Design Context (warm, green-led, red for danger only).
 */
export const colors = {
  primary: '#636B2F',
  /** Red: destructive actions only (delete, remove, errors). Do not use for cancel or notifications. */
  secondary: '#D32F2F',
  delete: '#d9534f',
  textPrimary: '#333333',
  textSecondary: '#555555',
  textSecondaryAlt: '#666666',
  /** Placeholder and hint text; meets contrast on surface. */
  placeholder: '#555555',
  bgLight: '#E8F5E9',
  bgRec: '#F1F8E9',
  stars: 'gold',
  /** Inactive/empty star in ratings. */
  starInactive: '#A0A0A0',
  disabled: '#9E9E9E',
  white: '#FFFFFF',
  /** Warm beige surface for screens and modals (prefer over pure white). */
  surface: '#F5F4F0',
  /** Slightly darker surface for list active state, inputs, cards. */
  surfaceVariant: '#EBE9E4',
  bgTint: '#EBECE6',
  /** Borders and dividers. */
  border: '#E0DDD8',
  borderLight: '#EDEBE7',
  /** Cancel / secondary action buttons (not destructive). */
  cancel: '#6B7280',
  /** Non-destructive notification badge (e.g. "new items"); use primary, not red. */
  badge: '#636B2F',
  /** Modal overlay backdrop. */
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  /** Shadow color (tinted dark instead of pure black where possible). */
  shadow: '#1A1A1A',
  /** Olive-tinted shadow for primary CTAs (warm depth, not generic gray). */
  shadowPrimary: 'rgba(99, 107, 47, 0.28)',
  /** Error/validation background and border (delete color family). */
  errorBg: 'rgba(217, 83, 79, 0.1)',
  errorBorder: 'rgba(217, 83, 79, 0.35)',
  textLightOpacity: 'rgba(255, 255, 255, 0.8)',
} as const;

export const headerStyle = { backgroundColor: colors.primary };
export const headerTintColor = '#fff';
export const loaderColor = colors.primary;

/** Minimum touch target size in pt (iOS HIG / Android: 44–48). Use for buttons, icons, list rows. */
export const touchTargetMin = 44;

/** Typography scale and font family. Plus Jakarta Sans for a distinctive, readable persona. */
export const typography = {
  /** Screen title and hero empty-state title (e.g. "Luettavien hylly", "Hylly on tyhjä"). */
  displaySize: 26,
  displayWeight: '700' as const,
  /** Section headings (e.g. "Mitä lukea seuraavaksi?"). */
  sectionSize: 23,
  sectionWeight: '700' as const,
  /** Empty-state supporting title (slightly smaller than display). */
  emptyHeroSize: 25,
  emptyHeroWeight: '700' as const,
  /** Display/section/empty-state headlines — Plus Jakarta Sans Bold. */
  fontFamilyDisplay: 'PlusJakartaSans_700Bold',
  /** Body text, list items, labels — Plus Jakarta Sans Regular. */
  fontFamilyBody: 'PlusJakartaSans_400Regular',
  /** Italic body (e.g. "Book" in header) — use for true italic slant. */
  fontFamilyBodyItalic: 'PlusJakartaSans_400Regular_Italic',
} as const;
