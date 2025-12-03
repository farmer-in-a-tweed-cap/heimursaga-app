const config = require('@repo/ui/tailwind.config');
const merge = require('lodash.merge');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [config],
  safelist: [
    'dark:bg-gray-300',
    'dark:bg-gray-700',
    'dark:bg-gray-800',
    'dark:bg-gray-900',
    'dark:bg-gray-950',
  ],
  theme: {
    extend: merge(config.theme.extend, {
      height: {
        'app-header': 'var(--app-header-height)',
      },
    }),
  },
};
