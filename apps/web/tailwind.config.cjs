const defaultTheme = require('tailwindcss/defaultTheme');
const forms = require('@tailwindcss/forms');

const withOpacity = (variable) => ({ opacityValue }) => {
  if (opacityValue === undefined) {
    return `rgb(var(${variable}))`;
  }
  return `rgb(var(${variable}) / ${opacityValue})`;
};

module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: withOpacity('--color-surface'),
          muted: withOpacity('--color-surface-muted'),
        },
        brand: {
          DEFAULT: withOpacity('--color-brand'),
          foreground: withOpacity('--color-brand-foreground'),
        },
        ink: {
          DEFAULT: withOpacity('--color-ink'),
          muted: withOpacity('--color-ink-muted'),
        },
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        danger: withOpacity('--color-danger'),
        accent: withOpacity('--color-accent'),
      },
      borderRadius: {
        xl: '1.25rem',
      },
      boxShadow: {
        card: '0 20px 45px rgba(15, 23, 42, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    forms({ strategy: 'class' }),
  ],
};
