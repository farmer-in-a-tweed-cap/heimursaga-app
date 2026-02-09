module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './../../packages/ui/src/**/*.{ts,tsx}',
    './@/**/*.{ts,tsx}',
  ],
  darkMode: ['class'],
  prefix: '',
  plugins: [require('tailwindcss-animate')],
  theme: {
    extend: {
      fontFamily: {
        // Redesign uses system fonts (matching Figma export)
        redesign: ['system-ui', 'sans-serif'],
        'redesign-mono': ['ui-monospace', 'monospace'],
      },
      screens: {
        desktop: '760px',
        mobile: '760px',
      },
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary))',
          foreground: 'rgb(var(--color-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary))',
          foreground: 'rgb(var(--color-secondary-foreground))',
          hover: 'rgb(var(--color-secondary-hover))',
        },
        dark: {
          DEFAULT: 'rgb(var(--color-dark))',
          foreground: 'rgb(var(--color-dark-foreground))',
          hover: 'rgb(var(--color-dark-hover))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--color-destructive))',
          foreground: 'rgb(var(--color-destructive-foreground))',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success))',
          foreground: 'rgb(var(--color-success-foreground))',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent))',
          foreground: 'rgb(var(--color-accent-foreground))',
        },
        background: {
          DEFAULT: 'rgb(var(--color-background))',
          foreground: 'rgb(var(--color-background-foreground))',
        },
        popover: {
          DEFAULT: 'rgb(var(--color-popover))',
          foreground: 'rgb(var(--color-popover-foreground))',
        },
        // Heimursaga redesign colors
        copper: {
          DEFAULT: '#ac6d46',
          dark: '#8a5738',
        },
        heimur: {
          blue: '#4676ac',
          dark: '#202020',
          gray: '#616161',
          light: '#b5bcc4',
          surface: '#f5f5f5',
          bg: '#404040',
          'bg-dark': '#2a2a2a',
        },
      },
      aspectRatio: {
        '4/3': '4/3',
        '5/2': '5/2',
      },
    },
  },
};
