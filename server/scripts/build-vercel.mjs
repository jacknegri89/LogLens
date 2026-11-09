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

// The model call can take 14-20 seconds and AI_TIMEOUT_MS is 40 seconds, so the function must be
// allowed to run longer than that. With a prebuilt output the limit is read from this file, not
// from vercel.json. 60 seconds is the highest value the free plan accepts.
const MAX_FUNCTION_SECONDS = 60;

writeFileSync(
  resolve(functionDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      maxDuration: MAX_FUNCTION_SECONDS,
    },
    null,
    2,
  ),
);

// 2. Frontend: static files.
cpSync(resolve(root, 'client/dist'), resolve(out, 'static'), { recursive: true });

// 3. Routing. Every page has its own HTML file (written by the client build, with the title,
//    description and link-preview tags of that page), so crawlers that do not run JavaScript read
//    the right tags. Order: headers on every response, real files, the API, the pages, and last a
//    real 404 for any other address (a single-page app would answer 200 with the home page).
//    Private pages carry X-Robots-Tag, which keeps them out of search results while the
//    crawlers of chat apps can still read their generic preview.
const NO_INDEX_HEADERS = { 'X-Robots-Tag': 'noindex, nofollow' };
const ONE_YEAR_CACHE = { 'Cache-Control': 'public, max-age=31536000, immutable' };
const ONE_DAY_CACHE = { 'Cache-Control': 'public, max-age=86400' };

const PUBLIC_PAGES = [
  { src: '/', dest: '/index.html' },
  { src: '/workbench/?', dest: '/workbench.html' },
  { src: '/privacy/?', dest: '/privacy.html' },
];

const PRIVATE_PAGES = [
  { src: '/history/?', dest: '/history.html', headers: NO_INDEX_HEADERS },
  { src: '/analyses/[^/]+/?', dest: '/analysis.html', headers: NO_INDEX_HEADERS },
  { src: '/shared/[^/]+/?', dest: '/shared.html', headers: NO_INDEX_HEADERS },
];

writeFileSync(
  resolve(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/(.*)', headers: SECURITY_HEADERS, continue: true },
        // File names in /assets contain a hash of their content: they never change.
        { src: '/assets/(.*)', headers: ONE_YEAR_CACHE, continue: true },
        {
          src: '/(og-image\\.jpg|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png|favicon\\.svg)',
          headers: ONE_DAY_CACHE,
          continue: true,
        },
        { handle: 'filesystem' },
        { src: '/api/(.*)', dest: '/api' },
        ...PUBLIC_PAGES,
        ...PRIVATE_PAGES,
        { src: '/(.*)', status: 404, dest: '/404.html', headers: NO_INDEX_HEADERS },
      ],
    },
    null,
    2,
  ),
);

console.log('Vercel output ready in .vercel/output');
