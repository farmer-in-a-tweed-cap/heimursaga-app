const config = require('@repo/ui/tailwind.config');
const merge = require('lodash.merge');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [config],
  theme: {
    extend: merge(config.theme.extend, {
      height: {
        'app-header': 'var(--app-header-height)',
      },
    }),
  },
};
