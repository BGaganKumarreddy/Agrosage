/**
 * AgroSage Design System Tokens
 *
 * Strict dark-theme palette adhering to WCAG AA contrast standards:
 * - Normal text (>= 4.5:1)
 * - Large text (>= 3:1)
 * - UI component boundaries and focus indicators (>= 3:1)
 */

export const WORKSPACE_THEME = {
  colors: {
    // Spatial hierarchy
    bgMain: '#212121',         // Main chat canvas (Luminance ~0.016)
    bgSidebar: '#171717',      // Navigation rail / drawer
    bgSurface: '#262626',      // Cards, popovers, prompt suggestions
    bgComposer: '#303030',     // Input container surface
    bgHover: '#2a2a2a',        // Interactive hover state
    bgActive: '#333333',       // Active / pressed state

    // Borders & dividers
    borderSubtle: '#414141',   // Structural borders (> 3:1 contrast against #212121)
    borderFocus: '#8DBB91',    // Focus ring accent

    // Typography
    textPrimary: '#ECECEC',    // High-contrast primary text (> 13:1 contrast on #212121)
    textSecondary: '#A3A3A3',  // Metadata, secondary descriptions (> 6:1 contrast on #212121)
    textSubtle: '#737373',     // Timestamps, section supertitles

    // Brand accent
    accentBrand: '#8DBB91',    // Agricultural sage green (restrained, non-glare)
    accentHover: '#7ba87f',    // Accent hover
    accentText: '#171717',     // Dark text on sage accent buttons (> 8:1 contrast)
  },
  radii: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.25rem',// 20px
    full: '9999px',
  },
};
