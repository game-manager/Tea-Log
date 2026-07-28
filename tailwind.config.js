/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 6px 24px rgba(24, 46, 38, 0.07)' },
    },
  },
  plugins: [],
}
