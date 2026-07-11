/** @type {import('tailwindcss').Config} */
export default {
  // Scan all renderer source files for class names.
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Apple-minimal design tokens ported from the PySide6 theme (ui/theme.py).
        primary: '#0071e3', // ACCENT_ON_WHITE
        ink: '#1d1d1f', // TEXT_PRIMARY
        muted: '#86868b', // TEXT_SECONDARY
        hairline: '#e8e8ed', // SURFACE_BORDER
        sidebar: '#f5f5f7', // SIDEBAR_FILL
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
