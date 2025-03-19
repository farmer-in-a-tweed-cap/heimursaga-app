const config = require('@repo/ui/tailwind.config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [config],
  theme: {
    extend: {
      height: {
        'app-header': 'hsl(var(--app-header-height))',
      },
    },
  },
};
