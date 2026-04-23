// Parse-all test — transpile every dist/*.jsx with @babel/preset-react and
// fail loudly on any syntax error. This is a cheap, high-value regression net:
// it catches the kind of JSX typo that only blows up at runtime in the browser
// (stranded brace, missing closing tag, bad spread) without having to spin up
// a browser or bundler.
//
// Run: node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import babel from '@babel/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');

const files = (await fs.readdir(DIST)).filter((f) => f.endsWith('.jsx')).sort();

test('dist/ contains the expected .jsx files', () => {
  const expected = ['app.jsx', 'auth.jsx', 'data.jsx', 'i18n.jsx', 'notify.jsx', 'tokens.jsx', 'ui.jsx'];
  for (const name of expected) {
    assert.ok(files.includes(name), `missing ${name}`);
  }
});

for (const name of files) {
  test(`parses ${name}`, async () => {
    const src = await fs.readFile(path.join(DIST, name), 'utf8');
    await babel.transformAsync(src, {
      filename: name,
      babelrc: false,
      configFile: false,
      presets: [['@babel/preset-react', { runtime: 'classic' }]],
      sourceType: 'script',
    });
  });
}
