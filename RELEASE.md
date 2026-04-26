# Releasing ElyHub

Tag → CI builds → GitHub Release with installers for every platform + auto-update manifest.

```bash
git tag v0.2.0 && git push origin v0.2.0
```

That's the whole release flow. Below: what to provision so the artifacts ship signed and the updater works.

---

## What ships per platform

| OS | File | Signed when… |
|---|---|---|
| macOS (Apple Silicon + Intel) | `.dmg` | `APPLE_*` secrets are set + notarized |
| Windows x64 | `.exe` (NSIS) + `.msi` | `WINDOWS_CERTIFICATE` is set |
| Linux x64 | `.AppImage` + `.deb` | n/a — community trust |

The auto-update manifest (`latest.json`) is also attached to every release. The desktop app's updater plugin reads it from the URL set in `tauri.conf.json` (`plugins.updater.endpoints`).

---

## One-time setup

### 1. Tauri updater signing key

The updater refuses to install any bundle that doesn't verify against the embedded public key. Generate the keypair once and stash both halves.

```bash
# Run inside ElyHub-app/
npx @tauri-apps/cli signer generate
# Outputs: ~/.tauri/elyhub.key + ~/.tauri/elyhub.key.pub
```

- Copy the **public key** into `tauri.conf.json` → `plugins.updater.pubkey` (replacing the `REPLACE_WITH_*` placeholder).
- Add the **private key** + its password as GitHub Actions secrets:
  - `TAURI_SIGNING_PRIVATE_KEY` ← contents of `elyhub.key`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` ← password you set during generate

### 2. macOS code-signing + notarization

Required to ship a `.dmg` users can open without Gatekeeper warnings. ~$99/yr Apple Developer membership.

```bash
# In Keychain Access on a signed-in Mac:
#   1. Request a "Developer ID Application" certificate via Xcode → Settings → Accounts
#   2. Export it as a .p12 with a password
#   3. base64 the .p12: base64 -i elyhub-developer-id.p12 | pbcopy
```

GitHub secrets:
- `APPLE_CERTIFICATE` — the base64-encoded .p12
- `APPLE_CERTIFICATE_PASSWORD` — the .p12 password
- `APPLE_SIGNING_IDENTITY` — looks like `Developer ID Application: Your Name (TEAMID)`
- `APPLE_ID` — the Apple ID email
- `APPLE_PASSWORD` — an **app-specific** password (appleid.apple.com → Sign-In and Security → App-Specific Passwords)
- `APPLE_TEAM_ID` — 10-char team ID from developer.apple.com → Membership

Without these the build still produces a .dmg, but Gatekeeper says "ElyHub can't be opened because Apple cannot check it for malicious software" and users have to right-click → Open the first time.

### 3. Windows Authenticode

Required to skip the SmartScreen "Unknown publisher" warning. EV certificates skip it instantly; standard certs warm up after several thousand installs. ~$100–500/yr from Sectigo, DigiCert, etc.

```bash
# Convert the .pfx to base64 for GitHub:
base64 -i elyhub-codesign.pfx | pbcopy
```

GitHub secrets:
- `WINDOWS_CERTIFICATE` — base64-encoded .pfx
- `WINDOWS_CERTIFICATE_PASSWORD` — .pfx password

Without these the build still produces a .msi/.exe, but SmartScreen warns on first install.

### 4. Updater endpoint

`tauri.conf.json` currently points at:
```
https://github.com/camara-ely/elyhub/releases/latest/download/latest.json
```

Adjust the org/repo if your fork lives elsewhere. The release workflow uploads `latest.json` to every release automatically — no separate hosting needed.

---

## Cutting a release

1. Bump `version` in `src-tauri/tauri.conf.json` AND `src-tauri/Cargo.toml`.
2. Update `CHANGELOG.md` (not gated — purely for humans).
3. Commit + tag:
   ```bash
   git commit -am "chore: v0.2.0"
   git tag v0.2.0
   git push && git push --tags
   ```
4. Workflow runs (`Release build` in the Actions tab). ~15 min.
5. Release lands at `github.com/<org>/<repo>/releases/tag/v0.2.0` with all artifacts attached.

The next time existing users open the app, the updater plugin polls the manifest, sees the new version, prompts to install, downloads the platform-matching artifact, verifies the Tauri signature, and applies.

---

## Mac App Store (future)

The DMG path above is for direct distribution (like Discord, Slack). For App Store you need a **separate workflow**:

1. Apple Developer membership ($99/yr) AND a **Mac App Store** distribution profile (different from Developer ID).
2. App Store Connect entry created (App ID, bundle id `app.ely.hub`, App Store metadata).
3. Sandbox entitlements added to `src-tauri/entitlements.plist` (App Store requires sandboxing — the `discord_oauth_listen` command that binds to `127.0.0.1:53134` will need to declare `com.apple.security.network.server`).
4. Build with `tauri build --bundles app` (not dmg), then sign with the **3rd Party Mac Developer Application** cert, then package into `.pkg` with `productbuild --component`.
5. Upload via `xcrun altool --upload-app` or Apple's Transporter app.
6. Review: ~24-48h. Apple may reject for sandboxing violations, in-app purchase rules (we use aura — should be fine since no real money), or missing privacy disclosures.

**Recommended path for MVP**: ship DMG with Developer ID + auto-update. Move to App Store after the product is stable and has users.

---

## Windows Store (future, optional)

Less common than App Store but doable via MSIX packaging. Tauri 2 doesn't bundle MSIX yet — you'd repackage the .exe with [MSIX Packaging Tool](https://learn.microsoft.com/en-us/windows/msix/packaging-tool/tool-overview) manually. Not recommended for MVP.

---

## Local testing

```bash
# Test the prod build locally without releasing:
npm run build:prod
# Output: src-tauri/target/release/bundle/{dmg,nsis,msi,appimage,deb}/

# Test the updater flow locally:
#   1. Build at version 0.1.0, install
#   2. Bump to 0.1.1, build, host latest.json + the artifact on a local server
#   3. Point tauri.conf.json endpoints at your local server
#   4. Open the installed 0.1.0 — should detect 0.1.1 and prompt
```
