import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f4f3ef',
        surface: '#ffffff',
        surface2: '#efede8',
        border: '#e0ddd8',
        border2: '#c8c5bf',
        text: '#0f0f0f',
        text2: '#333333',
        dim: '#6b6b6b',
        muted: '#a0a0a0',
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
        accent: '#1d4ed8',
        'accent-bg': '#eff6ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
