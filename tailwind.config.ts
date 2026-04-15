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

        // Warm rose/mocha accent (from the design inspo)
        rose: '#c4756a',
        'rose-bg': '#fdf0ee',
        'rose-text': '#a85c52',
        mocha: '#8b6f5e',
        'mocha-bg': '#f5ede8',
        'mocha-text': '#6b5045',

        // Semantic
        green: '#166534',
        'green-bg': '#dcfce7',
        'green-text': '#15803d',
        red: '#991b1b',
        'red-bg': '#fee2e2',
        'red-text': '#dc2626',
        amber: '#92400e',
        'amber-bg': '#fef3c7',
        'amber-text': '#d97706',
        blue: '#1e40af',
        'blue-bg': '#dbeafe',
        'blue-text': '#2563eb',

        // Primary accent — indigo, slightly warmed
        accent: '#6366f1',
        'accent-bg': '#eef0ff',
        'accent-text': '#4f46e5',

        // Pastel palette for stocks and cards
        'pastel-1': '#fce7f3',   // pink
        'pastel-1t': '#be185d',
        'pastel-2': '#dbeafe',   // blue
        'pastel-2t': '#1d4ed8',
        'pastel-3': '#dcfce7',   // green
        'pastel-3t': '#15803d',
        'pastel-4': '#fef3c7',   // amber
        'pastel-4t': '#b45309',
        'pastel-5': '#f3e8ff',   // purple
        'pastel-5t': '#7e22ce',
        'pastel-6': '#ccfbf1',   // teal
        'pastel-6t': '#0f766e',
        'pastel-7': '#ffedd5',   // orange
        'pastel-7t': '#c2410c',
        'pastel-8': '#e0e7ff',   // indigo
        'pastel-8t': '#3730a3',
        'pastel-9': '#fdf2f8',   // rose
        'pastel-9t': '#9d174d',
        'pastel-10': '#ecfccb',  // lime
        'pastel-10t': '#3f6212',
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
