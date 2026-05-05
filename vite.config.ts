import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: { port: 3000 },
  // F52: explicit sourcemap=false. Vite's production default is already
  // false, but pinning protects against an upstream default change or a
  // plugin that flips it on. Sourcemaps would expose the unminified
  // component graph to anyone hitting dist/.
  build: { sourcemap: false },
});
