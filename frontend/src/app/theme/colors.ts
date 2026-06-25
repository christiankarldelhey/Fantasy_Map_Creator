/**
 * Medieval Map Design System - Colorimetry
 * Style: Ancient Map / Old Book
 * Palette: Earth tones, parchment, ink, antique gold
 */

export const medievalColors = {
  // Parchment tones (backgrounds)
  parchment: {
    base: '#f4e4c1',      // Main parchment background
    light: '#faf3e0',     // Light parchment
    dark: '#e8d4a8',      // Dark parchment
    aged: '#d4c4a0',      // Aged parchment
    old: '#c9b896',       // Very old parchment
  },
  
  // Earth tones (panels, cards)
  earth: {
    base: '#c9a882',      // Earth brown
    light: '#d4b896',     // Light earth
    dark: '#a88760',      // Dark earth
    deep: '#8b6f4a',      // Deep earth
  },
  
  // Ink colors (text)
  ink: {
    black: '#2c2416',     // Black ink (primary text)
    brown: '#5c4a32',     // Brown ink (secondary text)
    light: '#8b7355',     // Light ink (muted text)
    faded: '#a08060',     // Faded ink (disabled text)
  },
  
  // Gold accents (borders, highlights)
  gold: {
    base: '#b8860b',      // Antique gold
    light: '#d4a520',     // Light gold
    dark: '#8b6914',      // Dark gold
    muted: '#9a7b19',     // Muted gold
  },
  
  // Leather tones (buttons, interactive elements)
  leather: {
    base: '#8b4513',      // Saddle brown (primary buttons)
    light: '#a0522d',     // Sienna (hover state)
    dark: '#6b3510',      // Dark leather (active state)
  },
  
  // Stone tones (neutral elements)
  stone: {
    base: '#808080',      // Stone gray
    light: '#a0a0a0',     // Light stone
    dark: '#606060',      // Dark stone
  },
  
  // Danger colors
  danger: {
    base: '#8b0000',      // Dark red
    light: '#a52a2a',     // Brown red
    dark: '#6b0000',      // Darker red
  },
  
  // Success colors
  success: {
    base: '#556b2f',      // Dark olive green
    light: '#6b8e23',     // Olive drab
    dark: '#3d4b22',      // Darker olive
  },
  
  // Shadows
  shadow: {
    light: 'rgba(44, 36, 22, 0.1)',
    medium: 'rgba(44, 36, 22, 0.2)',
    dark: 'rgba(44, 36, 22, 0.3)',
  },
} as const

// CSS variable names for Tailwind integration
export const cssVariables = {
  // Backgrounds
  '--bg-parchment': medievalColors.parchment.base,
  '--bg-parchment-light': medievalColors.parchment.light,
  '--bg-parchment-dark': medievalColors.parchment.dark,
  '--bg-earth': medievalColors.earth.base,
  '--bg-earth-light': medievalColors.earth.light,
  '--bg-earth-dark': medievalColors.earth.dark,
  
  // Text
  '--text-ink-black': medievalColors.ink.black,
  '--text-ink-brown': medievalColors.ink.brown,
  '--text-ink-light': medievalColors.ink.light,
  '--text-ink-faded': medievalColors.ink.faded,
  
  // Accents
  '--accent-gold': medievalColors.gold.base,
  '--accent-gold-light': medievalColors.gold.light,
  '--accent-gold-dark': medievalColors.gold.dark,
  
  // Buttons
  '--btn-leather': medievalColors.leather.base,
  '--btn-leather-light': medievalColors.leather.light,
  '--btn-leather-dark': medievalColors.leather.dark,
  
  // Borders
  '--border-gold': medievalColors.gold.base,
  '--border-earth': medievalColors.earth.dark,
  
  // Shadows
  '--shadow-light': medievalColors.shadow.light,
  '--shadow-medium': medievalColors.shadow.medium,
  '--shadow-dark': medievalColors.shadow.dark,
} as const

// Tailwind color palette (HSL format for CSS variables)
export const tailwindPalette = {
  background: {
    DEFAULT: 'var(--bg-parchment)',
    light: 'var(--bg-parchment-light)',
    dark: 'var(--bg-parchment-dark)',
  },
  surface: {
    DEFAULT: 'var(--bg-earth)',
    light: 'var(--bg-earth-light)',
    dark: 'var(--bg-earth-dark)',
  },
  foreground: {
    DEFAULT: 'var(--text-ink-black)',
    muted: 'var(--text-ink-brown)',
    light: 'var(--text-ink-light)',
    faded: 'var(--text-ink-faded)',
  },
  primary: {
    DEFAULT: 'var(--btn-leather)',
    light: 'var(--btn-leather-light)',
    dark: 'var(--btn-leather-dark)',
  },
  accent: {
    DEFAULT: 'var(--accent-gold)',
    light: 'var(--accent-gold-light)',
    dark: 'var(--accent-gold-dark)',
  },
  border: {
    gold: 'var(--border-gold)',
    earth: 'var(--border-earth)',
  },
} as const
