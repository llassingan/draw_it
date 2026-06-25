/**
 * Tailwind CSS v3 configuration for the collaborative whiteboard POC.
 *
 * content paths include all TS/TSX source files under src/.
 * Custom board colors provide consistent white / surface / border tones
 * for the board UI.
 */
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
