// Builds the Vercel "Build Output" folder (.vercel/output):
//   static/        -> the React app (client/dist)
//   functions/api  -> the Express API, bundled into a single file
// Run it from the server/ folder (see the "build:vercel" npm script).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('..');
const out = resolve(root, '.vercel/output');
const functionDir = resolve(out, 'functions/api.func');

rmSync(out, { recursive: true, force: true });
mkdirSync(functionDir, { recursive: true });

// 1. API: one bundled file. Prisma stays outside the bundle because it ships a
//    native engine file that must be copied as-is.
await build({
  entryPoints: ['src/vercel.ts'],
  outfile: resolve(functionDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: ['@prisma/client', '.prisma/client'],
  // Some bundled libraries use require(); this makes it available in ESM.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

cpSync(
  resolve('node_modules/@prisma/client'),
  resolve(functionDir, 'node_modules/@prisma/client'),
  {
    recursive: true,
  },
);
cpSync(resolve('node_modules/.prisma'), resolve(functionDir, 'node_modules/.prisma'), {
  recursive: true,
});

writeFileSync(
  resolve(functionDir, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs' }, null, 2),
);

// 2. Frontend: static files.
cpSync(resolve(root, 'client/dist'), resolve(out, 'static'), { recursive: true });

// 3. Routing: real files first, then /api/* to the function, everything else
//    to index.html (the React router handles the page).
writeFileSync(
  resolve(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: 'filesystem' },
        { src: '/api/(.*)', dest: '/api' },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Vercel output ready in .vercel/output');
