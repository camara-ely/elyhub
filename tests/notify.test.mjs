// notify integration test — exercises the prefs store and toast dispatch.
// Same sandbox pattern as i18n.test.mjs: fake window+localStorage, transpile
// notify.jsx, eval it, then drive the installed window.ElyNotify API.

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
  };
  const win = {
    localStorage, console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Audio: class { play() { return Promise.resolve(); } },
  };
  win.window = win;
  return win;
}

async function load(relPath, ctx) {
  const src = await fs.readFile(path.resolve(__dirname, '..', relPath), 'utf8');
  const { code } = await babel.transformAsync(src, {
    filename: relPath, babelrc: false, configFile: false,
    presets: [['@babel/preset-react', { runtime: 'classic' }]],
    sourceType: 'script',
  });
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: relPath });
}

test('ElyNotify installs with defaults', async () => {
  const ctx = fakeWindow();
  await load('dist/notify.jsx', ctx);
  assert.ok(ctx.ElyNotify);
  assert.equal(typeof ctx.ElyNotify.dispatch, 'function');
  assert.equal(typeof ctx.ElyNotify.subscribeToasts, 'function');
  // Default prefs enabled.
  assert.equal(ctx.ElyNotify.prefs.gifts, true);
});

test('dispatch fires a toast for an enabled kind', async () => {
  const ctx = fakeWindow();
  await load('dist/notify.jsx', ctx);

  const toasts = [];
  ctx.ElyNotify.subscribeToasts((t) => toasts.push(t));

  ctx.ElyNotify.dispatch({ kind: 'gift', title: 'Hi', body: 'world' });
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].kind, 'gift');
  assert.equal(toasts[0].title, 'Hi');
});

test('dispatch drops toasts when the pref is off', async () => {
  const ctx = fakeWindow();
  await load('dist/notify.jsx', ctx);

  const toasts = [];
  ctx.ElyNotify.subscribeToasts((t) => toasts.push(t));

  ctx.ElyNotify.setPref('gifts', false);
  ctx.ElyNotify.dispatch({ kind: 'gift', title: 'Hi', body: 'world' });
  assert.equal(toasts.length, 0, 'gift toast must be suppressed when prefs.gifts is off');

  // Other kinds still go through.
  ctx.ElyNotify.dispatch({ kind: 'drop', title: 'New', body: 'drop' });
  assert.equal(toasts.length, 1);
});

test('pushEvent dedups by id', async () => {
  const ctx = fakeWindow();
  await load('dist/notify.jsx', ctx);

  ctx.ElyNotify.pushEvent({ id: 'evt-1', kind: 'info', title: 'a' });
  ctx.ElyNotify.pushEvent({ id: 'evt-1', kind: 'info', title: 'dup' });
  const events = ctx.ElyNotify.getEvents();
  assert.equal(events.filter((e) => e.id === 'evt-1').length, 1);
});
