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
            'primary': 'rgb(var(--oe-primary) / <alpha-value>)',
            'primary-hover': 'rgb(var(--oe-primary-hover) / <alpha-value>)',
            'primary-deep': 'rgb(var(--oe-primary-deep) / <alpha-value>)',
            'primary-soft': 'rgb(var(--oe-primary-soft) / <alpha-value>)',
            'primary-tint': 'rgb(var(--oe-primary-tint) / <alpha-value>)',
            'accent': 'rgb(var(--oe-accent) / <alpha-value>)',
            'accent-tint': 'rgb(var(--oe-accent-tint) / <alpha-value>)',
            'bg': 'rgb(var(--oe-bg) / <alpha-value>)',
            'surface-low': 'rgb(var(--oe-surface-low) / <alpha-value>)',
            'surface': 'rgb(var(--oe-surface) / <alpha-value>)',
            'deep': 'rgb(var(--oe-deep) / <alpha-value>)',
            'ink': 'rgb(var(--oe-ink) / <alpha-value>)',
            'muted': 'rgb(var(--oe-muted) / <alpha-value>)',
            'faint': 'rgb(var(--oe-faint) / <alpha-value>)',
            'line': 'rgb(var(--oe-line) / <alpha-value>)',
            'available': 'rgb(var(--oe-available) / <alpha-value>)',
            'crisis': 'rgb(var(--oe-crisis) / <alpha-value>)',
            'crisis-tint': 'rgb(var(--oe-crisis-tint) / <alpha-value>)',
          },
          // Terra: every grey has a warm undertone, so Tailwind's gray scale is replaced.
          gray: {
            50: '#faf8f4', 100: '#f3f0ea', 200: '#e4e0d8', 300: '#d0ccc2', 400: '#a3a69c',
            500: '#74796e', 600: '#5c615a', 700: '#4a4e4a', 800: '#363a37', 900: '#2e3230',
          },
          // Forest green scale for the few places that need a shade rather than a token.
          forest: {
            50: '#f1f7f2', 100: '#e1efe4', 200: '#c8e8d0', 300: '#9ccaa8', 400: '#78a886',
            500: '#5b8f69', 600: '#4a7c59', 700: '#3a6648', 800: '#2a6038', 900: '#1e3b28',
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
          sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          display: ['Literata', 'Georgia', 'serif'],
          heading: ['Literata', 'Georgia', 'serif'],
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
