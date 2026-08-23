/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hb: {
          bg: '#0D1410',
          surface: '#161F1A',
          primary: '#3FA66E',
          'primary-dark': '#358B5C',
          secondary: '#C2843E',
          text: '#E9E6DC',
          muted: '#8A968E',
          border: '#232E27',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 8px 30px -8px rgba(63,166,110,0.55)',
        'glow-lg': '0 12px 40px -10px rgba(63,166,110,0.6)',
      },
    },
  },
  plugins: [],
};
