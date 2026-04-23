// Build smoke test — runs `node build.mjs` end-to-end and asserts the
// dist-prod/ output is well-formed. We check:
//   • All expected .js files exist (one per .jsx source)
//   • No .jsx references leaked into index.html
//   • The babel-standalone runtime is NOT in the prod bundle
//   • React is swapped to the production UMD
//   • Compiled app.js is smaller than the source app.jsx (proves minify ran)
//
// Run: node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROD = path.join(ROOT, 'dist-prod');
const SRC  = path.join(ROOT, 'dist');

test('build.mjs produces dist-prod/', { timeout: 60_000 }, async () => {
  const r = spawnSync('node', ['build.mjs'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, `build failed:\n${r.stdout}\n${r.stderr}`);

  const expected = ['app.js', 'auth.js', 'data.js', 'i18n.js', 'notify.js', 'tokens.js', 'ui.js', 'index.html', 'config.js'];
  const listed = await fs.readdir(PROD);
  for (const name of expected) {
    assert.ok(listed.includes(name), `missing ${name} in dist-prod/`);
  }
});

test('index.html is rewritten for production', async () => {
  const html = await fs.readFile(path.join(PROD, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /babel\/standalone/, 'babel-standalone must be stripped');
  assert.doesNotMatch(html, /\.jsx"/, 'no .jsx script refs should remain');
  assert.match(html, /react\.production\.min\.js/, 'React dev UMD must be swapped for prod');
  assert.match(html, /react-dom\.production\.min\.js/, 'ReactDOM dev UMD must be swapped for prod');
  assert.match(html, /src="app\.js"/, 'app.js script tag missing');
});

test('config.example.js is not shipped to prod', async () => {
  const listed = await fs.readdir(PROD);
  assert.ok(!listed.includes('config.example.js'), 'config.example.js must be excluded');
});

test('compiled app.js is smaller than source app.jsx', async () => {
  const [jsx, js] = await Promise.all([
    fs.stat(path.join(SRC, 'app.jsx')),
    fs.stat(path.join(PROD, 'app.js')),
  ]);
  assert.ok(js.size < jsx.size, `expected app.js (${js.size}) < app.jsx (${jsx.size}) after minify`);
});
