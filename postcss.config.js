// PostCSS pipeline: Tailwind generates utility classes, Autoprefixer adds
// vendor prefixes for the bundled Chromium runtime.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
