# Changelog

Human-readable log of what's in each release. Kept in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format — new
entries go at the top under `[Unreleased]`, then get moved under a dated
version heading when a tag is cut.

## [Unreleased]

### Added
- Production frontend build pipeline (`build.mjs`): transpiles JSX + minifies
  with esbuild, drops `@babel/standalone` from the shipped bundle.
- Self-hosted React UMDs in `dist/vendor/` — dev runs offline, prod ships
  without unpkg as a runtime dependency.
- Content-Security-Policy in `src-tauri/tauri.conf.json` (dev) and
  `src-tauri/tauri.conf.prod.json` (prod, hardened).
- GitHub Actions CI (`.github/workflows/ci.yml`): frontend tests + build,
  Rust fmt/clippy/check on every push + PR.
- Release workflow gated by tests, builds for macOS (AS + Intel), Windows,
  and Linux, and uses the prod config so shipped bundles are compiled.
- `node --test` suite covering i18n, notifications, build pipeline, and
  JSX parse health of every module.

### Changed
- Split the 13,714-line `dist/app.jsx` into 10 feature modules
  (theme/shell/state/modals/marketplace/home/profile/publishing/views/intro).
  `app.jsx` is now 724 lines and only wires the tree together.
- Compressed every shipped PNG asset to JPEG (q85). Image payload went
  from 43 MB to 7.6 MB; full `dist-prod/` bundle is 52 MB → 8.9 MB.

### Security
- CSP now blocks arbitrary script execution in production. Dev still
  allows `unsafe-eval` + unpkg for `@babel/standalone`; prod strips both.
- Documented that `dist/config.js` (Turso token) is extractable from the
  shipped binary — token must be read-only + RLS-guarded, or the
  frontend needs a backend proxy.

## [0.1.0] - initial

Tauri wrapper around the ElyHub design with mock data.
