// Full-bundle smoke test.
//
// Parses dist/index.html, extracts the <script> load order, transpiles
// every .jsx file the way the browser would, and evaluates the whole
// graph in a single vm context with a beefier fake browser than the
// per-module tests use.
//
// Catches the class of bugs the parse.test.mjs / i18n.test.mjs tier
// misses:
//   • script-order mistakes (module A references module B before B loads)
//   • missing globals (a module forgets to attach to window)
//   • runtime errors in top-level IIFEs
//   • typos that only surface when the real load chain runs
//
// Everything stays in-process — no Chromium, no tauri-driver — because
// this app is globals-only; there's no module system to simulate.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import babel from '@babel/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Polyfill just enough browser surface that the real modules don't
// crash on boot. We're not trying to render — just execute the top-level
// code and mount(). If a module reaches for something missing, add it here.
function fakeBrowser() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };

  // Minimal Element / Document — just the hooks modules actually touch
  // on boot (getElementById for #root, addEventListener for keydown).
  const listeners = new Map();
  const rootEl = {
    id: 'root',
    childNodes: [],
    appendChild(c) { this.childNodes.push(c); },
    removeChild(c) { this.childNodes = this.childNodes.filter(n => n !== c); },
    setAttribute() {}, removeAttribute() {}, hasAttribute() { return false; },
    addEventListener() {}, removeEventListener() {},
    style: {}, dataset: {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  const documentEl = {
    getElementById: (id) => (id === 'root' ? rootEl : null),
    createElement: () => ({
      style: {}, dataset: {}, childNodes: [],
      appendChild() {}, removeChild() {},
      setAttribute() {}, addEventListener() {},
    }),
    createTextNode: (t) => ({ nodeValue: t }),
    body: rootEl,
    documentElement: { style: {} },
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt).add(fn);
    },
    removeEventListener: (evt, fn) => listeners.get(evt)?.delete(fn),
    querySelector() { return null; }, querySelectorAll() { return []; },
    fonts: { ready: Promise.resolve() },
    visibilityState: 'visible',
    hidden: false,
  };

  const win = {
    localStorage,
    console,
    navigator: { language: 'en-US', userAgent: 'node-smoke-test', onLine: true },
    document: documentEl,
    setTimeout, clearTimeout, setInterval, clearInterval,
    queueMicrotask,
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: clearTimeout,
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {},
                        addEventListener() {}, removeEventListener() {} }),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} takeRecords() { return []; } },
    fetch: async () => ({ ok: false, status: 0, json: async () => ({}) }),
    crypto: { getRandomValues: (a) => { for (let i=0;i<a.length;i++) a[i]=Math.floor(Math.random()*256); return a; } },
    location: { href: 'tauri://localhost/', reload() {}, pathname: '/' },
    addEventListener: (evt, fn) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt).add(fn);
    },
    removeEventListener: (evt, fn) => listeners.get(evt)?.delete(fn),
    dispatchEvent: () => true,
    CustomEvent: class { constructor(t, d) { this.type = t; Object.assign(this, d); } },
    HTMLElement: class {},
    Audio: class { play() { return Promise.resolve(); } pause() {} },
  };
  win.window = win;
  win.globalThis = win;
  win.self = win;
  return win;
}

// Read the real index.html and pull out the script load order. This is
// the whole point — we're not duplicating the list, we're reading it.
async function scriptOrderFromIndexHtml() {
  const html = await fs.readFile(path.join(ROOT, 'dist/index.html'), 'utf8');
  const out = [];
  // Match every <script src="..."> (with or without type="text/babel")
  // that points at a local file — skip external URLs (unpkg, etc.) and
  // inline <script> blocks.
  const re = /<script[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (/^https?:/.test(src) || src.startsWith('//')) continue;
    out.push(src);
  }
  return out;
}

async function loadFile(src, ctx) {
  const abs = path.join(ROOT, 'dist', src);
  let code = await fs.readFile(abs, 'utf8');
  // Transpile JSX on the fly, same as babel-standalone would in-browser.
  if (abs.endsWith('.jsx')) {
    const out = await babel.transformAsync(code, {
      filename: abs,
      babelrc: false,
      configFile: false,
      presets: [['@babel/preset-react', { runtime: 'classic' }]],
      sourceType: 'script',
    });
    code = out.code;
  }
  vm.runInContext(code, ctx, { filename: abs });
}

test('the whole dist/ bundle loads in script order without crashing', async () => {
  const ctx = fakeBrowser();
  vm.createContext(ctx);

  // Stub ELYHUB_CONFIG so config.js isn't required for the test run.
  // (Real dist/config.js is gitignored; we shouldn't depend on it.)
  ctx.ELYHUB_CONFIG = {
    tursoUrl: '', tursoToken: '', meUserId: '',
    discordClientId: '', pollInterval: 5000,
  };

  // Stub React + ReactDOM minimally so vendor/*.development.js isn't
  // strictly required. Every module uses React.createElement, but they
  // don't run that at module-eval time — only from components, which
  // this smoke test doesn't render. So a no-op createElement is enough.
  ctx.React = {
    createElement: (t, p, ...c) => ({ type: t, props: p, children: c }),
    Fragment: Symbol('Fragment'),
    useState: (v) => [v, () => {}],
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useRef: (v) => ({ current: v }),
    useContext: () => ({}),
    useReducer: (r, i) => [i, () => {}],
    useLayoutEffect: () => {},
    createContext: () => ({ Provider: () => null, Consumer: () => null }),
    forwardRef: (fn) => fn,
    memo: (fn) => fn,
    Component: class { setState() {} },
    PureComponent: class { setState() {} },
  };
  ctx.ReactDOM = { createRoot: () => ({ render() {}, unmount() {} }), render() {} };

  const order = await scriptOrderFromIndexHtml();
  assert.ok(order.length > 10, `expected many scripts, got ${order.length}`);

  const failures = [];
  for (const src of order) {
    // Skip the React UMDs — we stubbed React above. Loading the real
    // UMDs in this context crashes because they touch DOM APIs we don't
    // polyfill fully. The real integration test is `tauri dev`.
    if (src.startsWith('vendor/')) continue;
    // config.js is user-specific; we stubbed ELYHUB_CONFIG above.
    if (src === 'config.js') continue;
    try {
      await loadFile(src, ctx);
    } catch (e) {
      failures.push({ src, err: e.message });
    }
  }

  if (failures.length) {
    const detail = failures.map(f => `  • ${f.src}: ${f.err}`).join('\n');
    assert.fail(`${failures.length} script(s) failed to load:\n${detail}`);
  }

  // Post-load invariants: every module that advertises a global MUST
  // have installed it. If any of these are missing, a module broke its
  // own contract — the test fails with a useful message.
  // ElyOps is conditional — data.jsx bails out if ELYHUB_CONFIG is empty
  // (which it is in this test), so only the unconditional globals are
  // guaranteed to exist here. __liveStatus is what data.jsx DOES install
  // on bail-out, so we check that instead as a proxy for "data.jsx ran".
  const expected = ['ElyI18N', 'ElyNotify', 'ElyAuth', '__liveStatus'];
  for (const g of expected) {
    assert.ok(ctx[g], `window.${g} should be installed after full bundle load`);
  }
});
