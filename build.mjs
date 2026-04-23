// ElyHub production frontend build.
//
// The app ships as raw .jsx files loaded in the browser via `@babel/standalone`
// at runtime. Great for dev (edit → ⌘R, no restart), terrible for production —
// babel-standalone is ~2MB, parsing JSX on every cold start is slow, and there
// is no minification.
//
// This script produces a parallel `dist-prod/` tree with:
//   • Each .jsx file pre-compiled to .js (JSX stripped → plain React calls)
//   • index.html rewritten — babel-standalone <script> dropped, all
//     `type="text/babel"` + `src="*.jsx"` references flipped to `*.js`
//   • Everything minified via esbuild (if available) or terser (fallback)
//   • Static assets (config.js, assets/**) copied verbatim
//
// Tauri's prod config (`src-tauri/tauri.conf.prod.json`) swaps `frontendDist`
// to `../dist-prod` so `tauri build` bundles the compiled copy. Dev (`tauri dev`)
// is untouched — it still loads raw .jsx from `../dist/`.
//
// Usage:
//   npm run build:frontend    # just produce dist-prod/
//   npm run build:prod        # frontend + tauri bundle
//
// Dependencies (devDependencies):
//   • @babel/core + @babel/preset-react — JSX → JS
//   • esbuild (preferred) OR terser — minifier
//
// Exits non-zero on any failure so `tauri build` aborts cleanly.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC  = path.join(__dirname, 'dist');
const DEST = path.join(__dirname, 'dist-prod');

// Files we never ship to production — the template config is a dev artifact,
// and any .bak/.swp hiding in dist/ shouldn't sneak into the bundle.
const SKIP = new Set(['config.example.js']);
const SKIP_EXT = new Set(['.bak', '.swp', '.DS_Store']);

// ───────────────────────── helpers ─────────────────────────

async function rmrf(p) {
  try { await fs.rm(p, { recursive: true, force: true }); } catch {}
}

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function shouldSkip(rel) {
  if (SKIP.has(path.basename(rel))) return true;
  if (SKIP_EXT.has(path.extname(rel))) return true;
  if (rel.includes('/.git/') || rel.endsWith('.map')) return true;
  return false;
}

// Lazy-load the transpiler and minifier so the script gives a clear error
// message if the devDependency is missing — instead of an opaque import trace.
let babel = null;
async function getBabel() {
  if (babel) return babel;
  try {
    babel = await import('@babel/core');
    return babel;
  } catch (e) {
    console.error('[build] @babel/core not installed. Run:  npm i -D @babel/core @babel/preset-react');
    throw e;
  }
}

let minifier = null;
async function getMinifier() {
  if (minifier !== null) return minifier;
  try {
    const esbuild = await import('esbuild');
    minifier = { kind: 'esbuild', mod: esbuild };
    return minifier;
  } catch {}
  try {
    const terser = await import('terser');
    minifier = { kind: 'terser', mod: terser };
    return minifier;
  } catch {}
  console.warn('[build] No minifier installed (esbuild or terser). Output will be unminified.');
  minifier = { kind: 'none' };
  return minifier;
}

async function transpileJSX(source, filename) {
  const b = await getBabel();
  const { code } = await b.transformAsync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    sourceType: 'script',
    compact: false,
    comments: false,
  });
  return code;
}

async function minifyJS(code) {
  const m = await getMinifier();
  if (m.kind === 'esbuild') {
    const r = await m.mod.transform(code, { minify: true, loader: 'js', target: 'es2020' });
    return r.code;
  }
  if (m.kind === 'terser') {
    const r = await m.mod.minify(code, { ecma: 2020, compress: true, mangle: true });
    return r.code || code;
  }
  return code;
}

// Rewrite index.html for production:
//   1. Drop the babel-standalone <script> — we don't need a runtime compiler.
//   2. Flip every `type="text/babel" src="*.jsx"` back to a plain script tag
//      pointing at `*.js`. Order is preserved — our files rely on it (tokens
//      before i18n before ui before app, etc.).
//   3. Leave React + ReactDOM UMD scripts in place — they're still expected
//      as globals by every compiled module.
function rewriteIndexHtml(html) {
  let out = html;

  // Remove the babel-standalone <script src="..."></script> line. We match the
  // pinned unpkg URL we know we use; falling back to any <script> with babel
  // in the src if someone changes CDNs.
  out = out.replace(
    /\s*<script[^>]*@babel\/standalone[^>]*><\/script>\s*/g,
    '\n'
  );

  // Swap React/ReactDOM dev UMDs for prod UMDs. We drop the pinned
  // `integrity` hashes — they target the .development.js bytes. A release
  // hardening pass can recompute SRI hashes against the prod URLs.
  out = out.replace(
    /<script[^>]*react@([\d.]+)\/umd\/react\.development\.js[^>]*><\/script>/g,
    '<script src="https://unpkg.com/react@$1/umd/react.production.min.js" crossorigin="anonymous"></script>'
  );
  out = out.replace(
    /<script[^>]*react-dom@([\d.]+)\/umd\/react-dom\.development\.js[^>]*><\/script>/g,
    '<script src="https://unpkg.com/react-dom@$1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>'
  );

  // Flip `type="text/babel" src="foo.jsx"` → `src="foo.js"` (drop the type).
  out = out.replace(
    /<script\s+type=["']text\/babel["']\s+src=["']([^"']+)\.jsx["']\s*><\/script>/g,
    '<script src="$1.js"></script>'
  );
  // Same, with attribute order swapped.
  out = out.replace(
    /<script\s+src=["']([^"']+)\.jsx["']\s+type=["']text\/babel["']\s*><\/script>/g,
    '<script src="$1.js"></script>'
  );

  return out;
}

// ───────────────────────── main ─────────────────────────

async function main() {
  const started = Date.now();
  console.log(`[build] cleaning ${path.relative(__dirname, DEST)}/`);
  await rmrf(DEST);
  await ensureDir(DEST);

  const files = await walk(SRC);
  let jsxCount = 0, copyCount = 0, htmlCount = 0;

  for (const abs of files) {
    const rel = path.relative(SRC, abs);
    if (shouldSkip(rel)) continue;

    const destAbs = path.join(DEST, rel);
    await ensureDir(path.dirname(destAbs));

    if (rel.endsWith('.jsx')) {
      const src = await fs.readFile(abs, 'utf8');
      let js = await transpileJSX(src, abs);
      js = await minifyJS(js);
      // Keep a header comment so dev poking at dist-prod/ can trace back.
      const outRel = rel.replace(/\.jsx$/, '.js');
      await fs.writeFile(
        path.join(DEST, outRel),
        `/* ElyHub compiled ${path.basename(rel)} — do not edit, edit dist/${rel} */\n${js}`
      );
      jsxCount++;
      continue;
    }

    if (rel === 'index.html') {
      const src = await fs.readFile(abs, 'utf8');
      const out = rewriteIndexHtml(src);
      await fs.writeFile(destAbs, out);
      htmlCount++;
      continue;
    }

    // Pass-through copy for everything else (config.js, assets/**, fonts, etc.).
    // Minify hand-written .js too — config.js is user-editable, we keep it
    // readable, so skip minification for the top-level .js files.
    if (rel.endsWith('.js') && !rel.includes('/')) {
      await fs.copyFile(abs, destAbs);
    } else {
      await fs.copyFile(abs, destAbs);
    }
    copyCount++;
  }

  const dt = ((Date.now() - started) / 1000).toFixed(2);
  console.log(
    `[build] done in ${dt}s — ${jsxCount} jsx → js, ${htmlCount} html rewritten, ${copyCount} copied → ${path.relative(__dirname, DEST)}/`
  );
}

main().catch((e) => {
  console.error('[build] failed:', e);
  process.exit(1);
});
