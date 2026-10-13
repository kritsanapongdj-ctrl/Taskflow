/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Chakra Petch"', 'Outfit', 'Prompt', 'sans-serif'],
        numeric: ['Outfit', '"Chakra Petch"', 'Prompt', 'sans-serif'],
        tech: ['"JetBrains Mono"', 'monospace'],
        body: ['Prompt', 'sans-serif'],
      },
      colors: {
        lh: {
          navy: '#0f2e4a',
          navyLight: '#184368',
          gold: '#bca374',
          goldLight: '#e6d0a7',
          paper: '#f8f9fa',
          slate: '#1e293b',
        }
      }
    },
  },
  plugins: [],
}
