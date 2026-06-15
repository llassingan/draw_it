/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#ffffff',
          surface: '#f8f9fa',
          border: '#dee2e6',
        },
      },
    },
  },
  plugins: [],
};
