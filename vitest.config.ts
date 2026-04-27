import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// `@vitejs/plugin-react-swc` decides between `optimizeDeps.esbuildOptions`
// and `optimizeDeps.rolldownOptions` based on its statically-imported Vite,
// which resolves to the project's Vite 5 (no rolldown). Vitest, however,
// runs on its own bundled Vite 8 (with rolldown), which then warns about
// the deprecated `esbuildOptions`. Translate the option here so the test
// run is warning-clean. Build mode is unaffected (different plugin path).
//
// Remove this wrapper when ANY of the following becomes true:
//   1. Project upgrades to Vite 6+ (the project's Vite gains rolldown,
//      so the SWC plugin emits `rolldownOptions` natively).
//   2. Vitest's bundled Vite version aligns with the project's Vite
//      (no more cross-version mismatch).
//   3. `@vitejs/plugin-react-swc` ships oxc-aware option emission that
//      handles the cross-Vite-version case itself.
// The hardcoded payload (`{ transform: { jsx: { runtime: 'automatic' } } }`)
// mirrors today's SWC plugin behavior; if the upstream rolldown payload
// changes, this wrapper would silently fall behind, which is another reason
// to remove it once any of the above conditions land.
const reactPlugins = react().map((plugin) => {
  // Filter on `apply: 'serve'` so we only wrap the serve-mode entry; the
  // build-mode entry shares the name `vite:react-swc` but never returns an
  // `optimizeDeps` block, and Vitest never invokes its `config()` anyway.
  // Tightening the filter makes the intent obvious.
  if (
    plugin &&
    typeof plugin === 'object' &&
    plugin.name === 'vite:react-swc' &&
    plugin.apply === 'serve' &&
    typeof plugin.config === 'function'
  ) {
    const originalConfig = plugin.config;
    return {
      ...plugin,
      config(this: unknown, ...args: Parameters<typeof originalConfig>) {
        const result = (originalConfig as (...a: unknown[]) => unknown).apply(this, args) as
          | { optimizeDeps?: Record<string, unknown> }
          | undefined;
        if (result?.optimizeDeps && 'esbuildOptions' in result.optimizeDeps) {
          const nextOptimizeDeps: Record<string, unknown> = {};
          for (const key of Object.keys(result.optimizeDeps)) {
            if (key !== 'esbuildOptions') nextOptimizeDeps[key] = result.optimizeDeps[key];
          }
          nextOptimizeDeps.rolldownOptions = { transform: { jsx: { runtime: 'automatic' } } };
          return { ...result, optimizeDeps: nextOptimizeDeps };
        }
        return result;
      },
    };
  }
  return plugin;
});

export default defineConfig({
  plugins: [reactPlugins],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
