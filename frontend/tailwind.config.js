/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Medieval Map Palette
        parchment: {
          base: 'var(--bg-parchment)',
          light: 'var(--bg-parchment-light)',
          dark: 'var(--bg-parchment-dark)',
          aged: 'var(--bg-parchment-aged)',
          old: 'var(--bg-parchment-old)',
        },
        earth: {
          base: 'var(--bg-earth)',
          light: 'var(--bg-earth-light)',
          dark: 'var(--bg-earth-dark)',
          deep: 'var(--bg-earth-deep)',
        },
        ink: {
          black: 'var(--text-ink-black)',
          brown: 'var(--text-ink-brown)',
          light: 'var(--text-ink-light)',
          faded: 'var(--text-ink-faded)',
        },
        gold: {
          base: 'var(--accent-gold)',
          light: 'var(--accent-gold-light)',
          dark: 'var(--accent-gold-dark)',
          muted: 'var(--accent-gold-muted)',
        },
        leather: {
          base: 'var(--btn-leather)',
          light: 'var(--btn-leather-light)',
          dark: 'var(--btn-leather-dark)',
        },
        // Semantic colors (using CSS variables)
        background: {
          DEFAULT: 'var(--bg-parchment)',
          light: 'var(--bg-parchment-light)',
          dark: 'var(--bg-parchment-dark)',
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
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: 'var(--bg-earth)',
          light: 'var(--bg-earth-light)',
          dark: 'var(--bg-earth-dark)',
          foreground: 'var(--text-ink-black)',
        },
        accent: {
          DEFAULT: 'var(--accent-gold)',
          light: 'var(--accent-gold-light)',
          dark: 'var(--accent-gold-dark)',
          foreground: 'var(--text-ink-black)',
        },
        muted: {
          DEFAULT: 'var(--bg-parchment-dark)',
          foreground: 'var(--text-ink-brown)',
        },
        border: {
          DEFAULT: 'var(--border-earth)',
          gold: 'var(--border-gold)',
          earth: 'var(--border-earth)',
        },
        card: {
          DEFAULT: 'var(--bg-parchment)',
          foreground: 'var(--text-ink-black)',
        },
        destructive: {
          DEFAULT: '#8b0000',
          foreground: '#ffffff',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        serif: ['Cinzel', 'Georgia', 'serif'],
        book: ['IM Fell English', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
