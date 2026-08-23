/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Charte Konnexyon — site de rencontre par l'écriture
        encre:    '#0B0B0B',
        ivoire:   '#F2EEE6',
        or:       '#C9A84C',
        graphite: '#343334',
        brume:    '#A8A39A',

        // alias historiques, repointés sur la charte
        bg:       '#F2EEE6',
        surface:  '#EAE5DB',
        surface2: '#E1DBD0',
        gold:     '#C9A84C',
        'gold-light': '#E8CC7A',
        'gold-dark':  '#A07830',
        text:     '#0B0B0B',
        muted:    '#A8A39A',
      },
      fontFamily: {
        serif: ['Cormorant', 'serif'],
        sans:  ['Inter', 'sans-serif'],
      },
      keyframes: {
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulse_gold: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201,168,76,0.2)' },
          '50%':      { boxShadow: '0 0 40px rgba(201,168,76,0.5)' },
        },
      },
      animation: {
        slideDown:   'slideDown 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        shimmer:     'shimmer 3s ease infinite',
        pulse_gold:  'pulse_gold 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
