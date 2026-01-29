/**
 * Shared theme colors and common UI patterns.
 * Aligned with .cursorrules design system.
 */
export const colors = {
  primary: '#636B2F',
  secondary: '#D32F2F',
  delete: '#d9534f',
  textPrimary: '#333333',
  textSecondary: '#555555',
  textSecondaryAlt: '#666666',
  bgLight: '#E8F5E9',
  bgRec: '#F1F8E9',
  stars: 'gold',
  disabled: '#9E9E9E',
  white: '#FFFFFF',
  bgTint: '#EBECE6',
  textLightOpacity: 'rgba(255, 255, 255, 0.8)',
} as const;

export const headerStyle = { backgroundColor: colors.primary };
export const headerTintColor = '#fff';
export const loaderColor = colors.primary;
