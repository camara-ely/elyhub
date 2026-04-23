// i18n integration test — transpiles dist/i18n.jsx, evals it in a minimal
// fake-browser sandbox (no jsdom, just window + localStorage + console), and
// verifies the installed globals behave.
//
// This is the template for testing any of the global-scope modules: it avoids
// the need for a module system while still exercising the real source.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import babel from '@babel/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fakeWindow() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
  const win = {
    localStorage,
    console,
    navigator: { language: 'en-US' },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  win.window = win;
  return win;
}

async function loadModule(relPath, ctx) {
  const src = await fs.readFile(path.resolve(__dirname, '..', relPath), 'utf8');
  const { code } = await babel.transformAsync(src, {
    filename: relPath,
    babelrc: false,
    configFile: false,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    sourceType: 'script',
  });
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: relPath });
}

test('ElyI18N installs with default locale and falls back cleanly', async () => {
  const ctx = fakeWindow();
  await loadModule('dist/i18n.jsx', ctx);

  assert.ok(ctx.ElyI18N, 'window.ElyI18N must be installed');
  assert.equal(typeof ctx.ElyI18N.t, 'function');

  // Default English.
  assert.equal(ctx.ElyI18N.t('nav.home'), 'Home');

  // Missing key returns the key itself (so dev spots it, no crash).
  assert.equal(ctx.ElyI18N.t('nav.__missing__'), 'nav.__missing__');

  // Locale switch.
  ctx.ElyI18N.setLang('pt');
  assert.equal(ctx.ElyI18N.t('nav.home'), 'Início');
  assert.equal(ctx.ElyI18N.getLang(), 'pt');

  // Persistence — setLang should have written to localStorage.
  assert.equal(ctx.localStorage.getItem('elyhub.lang.v1'), 'pt');

  // Unsupported locales are ignored, not crashed on.
  ctx.ElyI18N.setLang('klingon');
  assert.equal(ctx.ElyI18N.getLang(), 'pt');
});

test('setLang subscribers fire on change', async () => {
  const ctx = fakeWindow();
  await loadModule('dist/i18n.jsx', ctx);

  let hits = 0;
  const unsub = ctx.ElyI18N.subscribe(() => { hits++; });
  ctx.ElyI18N.setLang('pt');
  ctx.ElyI18N.setLang('en');
  assert.equal(hits, 2);

  unsub();
  ctx.ElyI18N.setLang('pt');
  assert.equal(hits, 2, 'unsubscribed listener must not fire');
});
