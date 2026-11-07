/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Gold scale. Use gold-300/400 on dark emerald, gold-700+ for small text on light backgrounds (AA contrast).
        gold: {
          50: '#FBF7E8',
          100: '#F5EBC4',
          200: '#EBD78F',
          300: '#E2C566',
          400: '#D4AF37',
          500: '#BF9B2E',
          600: '#9C7C23',
          700: '#7A611B',
          800: '#5C4916',
          900: '#3D2F0F',
        },
        ivory: '#FBFAF5',
      },
      fontFamily: {
        display: ['"Sora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Manrope"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(212,175,55,.35), 0 20px 60px -20px rgba(212,175,55,.35)',
      },
    },
  },
  plugins: [],
};
