/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Prompt', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Prompt', 'Inter', 'sans-serif'],
        body: ['Prompt', 'Inter', 'sans-serif'],
        tech: ['Inter', 'system-ui', 'sans-serif'],
        numeric: ['Inter', 'Prompt', 'sans-serif'],
      },
      colors: {
        burgundy: {
          50: '#FDF2F4',
          100: '#FCE7EB',
          200: '#F7C5CD',
          300: '#EE96A4',
          400: '#E06277',
          500: '#C5334E',
          600: '#7A1C28', // Primary Burgundy (Corporate Luxury)
          700: '#65121E',
          800: '#500E17',
          900: '#3D0A11',
          DEFAULT: '#7A1C28',
        },
        navy: {
          50: '#F0F5FA',
          100: '#D9E6F2',
          200: '#B3CDE5',
          700: '#1A4A75',
          800: '#133758',
          900: '#0F2E4A', // Secondary Navy (LH Anchor)
          950: '#091D30',
          DEFAULT: '#0F2E4A',
        },
        lh: {
          burgundy: '#7A1C28',
          navy: '#0F2E4A',
          navyLight: '#184368',
          gold: '#C5A869',
          goldLight: '#F5EEDC',
          paper: '#F8FAFC',
          surface: '#FFFFFF',
          slate: '#0F172A',
        },
        bg: '#1e1e2e',
        'bg-dark': '#181828',
        'bg-thumb': '#2a2a3a',
        border: '#4a4a6a',
        accent: '#6030ff',
        'accent-bright': '#746fff',
        text: 'rgba(255, 255, 255, 0.9)',
        'text-muted': 'rgba(255, 255, 255, 0.5)',
        'btn-bg': 'rgb(53, 52, 69)',
        'btn-hover': 'rgb(78, 75, 104)',
        'active-bg': 'rgb(44, 43, 109)',
        'reset-text': '#ecc',
        danger: '#d14249',
        warning: '#ff8d14',
        'status-permission': '#cca700',
        'status-active': '#3794ff',
        'status-success': '#89d185',
        'status-error': '#d14249',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 15px -3px rgba(15, 46, 74, 0.06), 0 4px 6px -4px rgba(15, 46, 74, 0.04)',
        'pixel': '2px 2px 0px #0a0a14',
      }
    },
  },
  plugins: [],
}
