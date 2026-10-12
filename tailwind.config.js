/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './app/**/*.{vue,js,ts,jsx,tsx}',
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.{vue,js,ts,jsx,tsx}',
    './pages/**/*.{vue,js,ts,jsx,tsx}',
    './plugins/**/*.{vue,js,ts,jsx,tsx}',
    './app.vue'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        brand: {
          DEFAULT: '#6C3CE1',
          50: '#F6F2FF',
          100: '#EDE5FE',
          200: '#DCCDFD',
          300: '#C3A8FA',
          400: '#A47BF7',
          500: '#6C3CE1',
          600: '#5A2ECD',
          700: '#4921B5',
          800: '#3A1A93',
          900: '#2B136F',
          purple: '#6C3CE1'
        },
        accent: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          blue: '#3B82F6'
        }
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)'
      }
    }
  },
  plugins: []
}
