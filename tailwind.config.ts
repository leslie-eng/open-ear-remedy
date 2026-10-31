/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        // Values live as CSS variables in src/index.css so CSS and Tailwind share one source.
        colors: {
          oe: {
            blue: 'var(--oe-blue)',
            'blue-hover': 'var(--oe-blue-hover)',
            'blue-bright': 'var(--oe-blue-bright)',
            'blue-tint': 'var(--oe-blue-tint)',
            mist: 'var(--oe-mist)',
            sage: 'var(--oe-sage)',
            'sage-soft': 'var(--oe-sage-soft)',
            sand: 'var(--oe-sand)',
            cream: 'var(--oe-cream)',
            ink: 'var(--oe-ink)',
            muted: 'var(--oe-muted)',
            line: 'var(--oe-line)',
            available: 'var(--oe-available)',
            crisis: 'var(--oe-crisis)',
          },
        },
        borderRadius: {
          'oe-sm': 'var(--oe-radius-sm)',
          'oe-md': 'var(--oe-radius-md)',
        },
        boxShadow: {
          'oe-sm': 'var(--oe-shadow-sm)',
          'oe-md': 'var(--oe-shadow-md)',
        },
        fontFamily: {
          display: ['"Playfair Display"', 'serif'],
          heading: ['Poppins', 'sans-serif'],
        },
        fontSize: {
          body: ['1.0625rem', { lineHeight: '1.6' }],     // 17px
          'body-lg': ['1.125rem', { lineHeight: '1.6' }], // 18px
        },
        transitionTimingFunction: {
          'oe-out': 'cubic-bezier(.22,1,.36,1)',
        },
        transitionDuration: {
          'oe-fast': '200ms',
          'oe-base': '350ms',
          'oe-slow': '600ms',
        },
      },
    },
    plugins: [],
  }
