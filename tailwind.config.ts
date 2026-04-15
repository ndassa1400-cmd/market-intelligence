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
        green: '#1a5c2a',
        'green-bg': '#f0f7f1',
        red: '#8b1f1f',
        'red-bg': '#fdf2f2',
        amber: '#6b4800',
        'amber-bg': '#fdf8ed',
        blue: '#1a3d6b',
        'blue-bg': '#eef3fa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
