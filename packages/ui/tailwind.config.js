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
        background: {
          DEFAULT: '#ffffff',
        },
        primary: {
          DEFAULT: '#AA6C46',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#212121',
        },
        destructive: {
          DEFAULT: '#CC3300',
        },
      },
      aspectRatio: {
        '4/3': '4/3',
        '5/2': '5/2',
      },
    },
  },
};
