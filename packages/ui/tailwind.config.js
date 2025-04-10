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
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        dark: {
          DEFAULT: 'var(--dark)',
          foreground: 'var(--dark-foreground)',
          hover: 'var(--dark-hover)',
        },
        destructive: {
          DEFAULT: '#CC3300',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        background: {
          DEFAULT: 'var(--background)',
          foreground: 'var(--background-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
      },
      fontSize: {
        xxs: '0.625rem',
      },
      aspectRatio: {
        '4/3': '4/3',
        '5/2': '5/2',
      },
    },
  },
};
