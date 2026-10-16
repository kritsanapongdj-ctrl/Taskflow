/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cinzel', '"Noto Serif Thai"', 'serif'],
        display: ['Cinzel', '"Chakra Petch"', 'Prompt', 'sans-serif'],
        numeric: ['"JetBrains Mono"', 'Outfit', '"Chakra Petch"', 'monospace'],
        tech: ['"JetBrains Mono"', 'monospace'],
        body: ['Prompt', 'sans-serif'],
      },
      colors: {
        lh: {
          navy: '#0B1B3D',
          navyDark: '#060E21',
          navySlate: '#102A43',
          gold: '#B89246',
          goldLight: '#E5C989',
          goldDark: '#8C6C29',
          retroBg: '#F0F4F8',
          cyan: '#00F0FF',
          yellow: '#FFEA00',
          paper: '#F0F4F8',
          slate: '#102A43',
        }
      },
      boxShadow: {
        'retro-gold': '4px 4px 0px 0px #B89246',
        'retro-gold-sm': '2px 2px 0px 0px #B89246',
        'retro-dark': '4px 4px 0px 0px #0B1B3D',
        'retro-dark-sm': '2px 2px 0px 0px #0B1B3D',
        'retro-cyan': '4px 4px 0px 0px #00F0FF',
        'retro-cyan-sm': '2px 2px 0px 0px #00F0FF',
        'retro-yellow': '4px 4px 0px 0px #FFEA00',
        'retro-yellow-sm': '2px 2px 0px 0px #FFEA00',
      }
    },
  },
  plugins: [],
}
