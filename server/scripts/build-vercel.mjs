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

// Headers sent with every response. The content security policy allows only what the app
// loads: its own scripts, its own API and the Google Fonts stylesheet and files. Inline styles
// are allowed because React sets some layout values as style attributes.
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  // Shared-report URLs contain bearer tokens, including on same-origin requests.
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// 1. API: one bundled file. Prisma 7 needs no native engine: its query compiler is
//    embedded in the client as base64, so the whole client is bundled with the app.
await build({
  entryPoints: ['src/vercel.ts'],
  outfile: resolve(functionDir, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // pg-native is an optional speed-up of the pg driver; it is not installed and not needed.
  external: ['pg-native'],
  // Some bundled libraries use require(); this makes it available in ESM.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
});

writeFileSync(
  resolve(functionDir, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs' }, null, 2),
);

// 2. Frontend: static files.
cpSync(resolve(root, 'client/dist'), resolve(out, 'static'), { recursive: true });

// 3. Routing: security headers on every response, then real files first, /api/* to the
//    function, everything else to index.html (the React router handles the page).
writeFileSync(
  resolve(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: SECURITY_HEADERS, continue: true },
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
