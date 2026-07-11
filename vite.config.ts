import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite config for the renderer process.
// `base: './'` produces relative asset paths so the built index.html can be
// loaded from disk by Electron via the file:// protocol in production.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      // Matches the `@shared/*` import style used across the app.
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Pre-bundle heavy dependencies into a single optimized module up front.
  // `lucide-react` in particular exposes ~1,500 tiny icon modules; without this
  // Vite transforms them on demand at startup, making the first load sluggish.
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
