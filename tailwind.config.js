/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      borderRadius: {
        '4xl': '2.5rem',
      },
      screens: {
        'xs': '375px',
        ...require('tailwindcss/defaultTheme').screens,
      },
      fontSize: {
        '2xs': '0.65rem',
      },
      spacing: {
        '4.5': '1.125rem',
      },
      maxWidth: {
        'screen-xs': '375px',
      },
      minHeight: {
        'screen-xs': '600px',
      },
    },
  },
  plugins: [],
};
