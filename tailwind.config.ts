import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm beige base — inspired by editorial/organic design
        bg: '#faf7f4',
        surface: '#ffffff',
        surface2: '#f4f0eb',
        surface3: '#ede8e1',
        border: '#e8e3db',
        border2: '#d4cec5',
        text: '#1a1714',
        text2: '#322d29',
        dim: '#5a5450',
        muted: '#8a8078',

        // Semantic — keep green/red for P&L (financial meaning)
        green: '#166534',
        'green-bg': '#dcfce7',
        'green-text': '#15803d',
        red: '#991b1b',
        'red-bg': '#fee2e2',
        'red-text': '#dc2626',

        // Primary accent — warm caramel
        accent: '#c97c42',
        'accent-bg': '#fdf6ee',
        'accent-text': '#8a4a22',

        // Full caramel / sand family — 10 shades from cream to deep
        cream: '#fdf6ee',
        sand: '#faecd8',
        'sand-warm': '#f5d9b2',
        'sand-border': '#ebb98a',
        caramel: '#c97c42',
        'caramel-mid': '#a85f2e',
        'caramel-dark': '#8a4a22',
        'caramel-deep': '#6d3718',
        'caramel-richest': '#4a2510',
        'caramel-rich2': '#dc9a62',

        // Pastel palette — 10 caramel shades for stocks/tags/cards
        'pastel-1': '#fdf6ee',
        'pastel-1t': '#6d3718',
        'pastel-2': '#faecd8',
        'pastel-2t': '#4a2510',
        'pastel-3': '#f5d9b2',
        'pastel-3t': '#4a2510',
        'pastel-4': '#edd4a0',
        'pastel-4t': '#6d3718',
        'pastel-5': '#e4c07e',
        'pastel-5t': '#4a2510',
        'pastel-6': '#d9a85c',
        'pastel-6t': '#fdf6ee',
        'pastel-7': '#c97c42',
        'pastel-7t': '#fdf6ee',
        'pastel-8': '#a85f2e',
        'pastel-8t': '#faecd8',
        'pastel-9': '#8a4a22',
        'pastel-9t': '#faecd8',
        'pastel-10': '#6d3718',
        'pastel-10t': '#fdf6ee',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(26,23,20,0.06), 0 4px 16px 0 rgba(26,23,20,0.04)',
        'card-hover': '0 4px 12px 0 rgba(26,23,20,0.10), 0 8px 32px 0 rgba(26,23,20,0.06)',
        soft: '0 2px 8px 0 rgba(26,23,20,0.08)',
      },
    },
  },
  plugins: [],
}
export default config
