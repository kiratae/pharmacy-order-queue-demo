import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import swc from 'unplugin-swc';

export default defineConfig({
  // swc (not esbuild) transforms TS here so `emitDecoratorMetadata` is actually
  // emitted — Nest's DI (e.g. AuthGuard's Reflector) relies on that metadata,
  // and esbuild silently drops it.
  plugins: [tsconfigPaths(), swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
