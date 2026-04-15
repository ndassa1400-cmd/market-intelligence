import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f7f5f2',
        surface: '#ffffff',
        surface2: '#f0ede8',
        border: '#e4e0da',
        border2: '#ccc8c0',
        text: '#0f0f0f',
        text2: '#2d2d2d',
        dim: '#6b6b6b',
        muted: '#a0a0a0',

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
        accent: '#6366f1',
        'accent-bg': '#eef2ff',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
