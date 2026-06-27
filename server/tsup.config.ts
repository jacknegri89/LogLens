import { defineConfig } from 'tsup';

// tsup turns our TypeScript into plain JavaScript in `dist/`.
// It uses esbuild under the hood, so it's fast and we don't have to
// worry about adding `.js` extensions to our imports.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true, // wipe dist/ before each build
  sourcemap: true, // map errors back to the .ts source
});
