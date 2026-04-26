// Discord OAuth2 Implicit Grant flow — two-phase design to avoid Windows
// port-conflict errors (os error 10048).
//
// Phase 1  discord_oauth_start()  → scans ports 53134-53200, binds the first
//   free one, spawns the HTTP listener thread, stashes the receiver in app
//   state, and returns the actual port number to JS so it can build the
//   redirect_uri dynamically.
//
// Phase 2  discord_oauth_await()  → pulls the receiver from state and blocks
//   up to 5 min for the callback token.
//
// JS flow:
//   const port = await invoke('discord_oauth_start');
//   // build authUrl with redirect = `http://127.0.0.1:${port}/callback`
//   await invoke('open_url', { url: authUrl });
//   const token = await invoke('discord_oauth_await');
//
// Splitting the phases means a second sign-in attempt (while the first is
// still pending or timed out) always gets a fresh port — no WSAEADDRINUSE.

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Mutex;
use std::time::Duration;
use tokio::sync::oneshot;

// Shared state: the receiver half of a oneshot channel lives here between the
// two command calls. oneshot is used (vs mpsc) so discord_oauth_await can be
// a proper async fn that awaits without blocking any thread.
struct OAuthWaiter(Mutex<Option<oneshot::Receiver<Result<String, String>>>>);

const CALLBACK_HTML: &str = r#"<!doctype html>
<html><head><title>ElyHub — Signed in</title>
<meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #05060A; color: #fff; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
  .box { padding: 40px; max-width: 420px; }
  h2 { font-weight: 500; margin: 0 0 12px; letter-spacing: -0.02em; }
  p { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0; }
  .spinner { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body><div class="box">
<div class="spinner"></div>
<h2 id="title">Signing you in...</h2>
<p id="msg">Hang on a sec.</p>
<script>
  const hash = location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  const error = params.get('error');
  const done = (ok, title, msg) => {
    document.querySelector('.spinner').style.display = 'none';
    document.getElementById('title').textContent = title;
    document.getElementById('msg').textContent = msg;
    if (ok) setTimeout(() => window.close(), 1200);
  };
  if (error) {
    fetch('/token?error=' + encodeURIComponent(error)).finally(() =>
      done(false, 'Authorization cancelled', 'You can close this window.'));
  } else if (token) {
    fetch('/token?access_token=' + encodeURIComponent(token))
      .then((r) => r.ok ? done(true, 'Signed in!', 'You can close this window.') : Promise.reject())
      .catch(() => done(false, 'Something went wrong', 'Please try again from the app.'));
  } else {
    done(false, 'No token received', 'Close this window and try again.');
  }
</script>
</div></body></html>"#;

// Simple percent-decoder for the access_token query param.
fn pct_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(hex) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(hex as char);
                i += 3;
                continue;
            }
        } else if b[i] == b'+' {
            out.push(' ');
            i += 1;
            continue;
        }
        out.push(b[i] as char);
        i += 1;
    }
    out
}

// Phase 1 — bind a free port, start the listener thread, return port number.
#[tauri::command]
fn discord_oauth_start(state: tauri::State<'_, OAuthWaiter>) -> Result<u16, String> {
    let (tx, rx) = oneshot::channel::<Result<String, String>>();

    // Scan for a free port so retries don't hit WSAEADDRINUSE.
    let listener = (53134u16..=53200)
        .find_map(|p| TcpListener::bind(format!("127.0.0.1:{}", p)).ok())
        .ok_or_else(|| "all OAuth ports 53134-53200 in use".to_string())?;

    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    std::thread::spawn(move || {
        // tx is consumed on first send — wrap in Option so the loop can
        // check whether we already sent without moving it.
        let mut tx_opt = Some(tx);
        listener.set_nonblocking(false).ok();
        for stream_result in listener.incoming() {
            if tx_opt.is_none() {
                break;
            } // already sent — stop accepting
            let mut stream = match stream_result {
                Ok(s) => s,
                Err(_) => continue,
            };
            let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));

            let mut buf = [0u8; 8192];
            let n = stream.read(&mut buf).unwrap_or(0);
            if n == 0 {
                continue;
            }
            let req = String::from_utf8_lossy(&buf[..n]).to_string();
            let first_line = req.lines().next().unwrap_or("").to_string();

            if first_line.starts_with("GET /token") {
                let path = first_line.split(' ').nth(1).unwrap_or("");
                let query = path.split('?').nth(1).unwrap_or("");
                let mut token: Option<String> = None;
                let mut err: Option<String> = None;
                for pair in query.split('&') {
                    let mut it = pair.splitn(2, '=');
                    if let (Some(k), Some(v)) = (it.next(), it.next()) {
                        match k {
                            "access_token" => token = Some(pct_decode(v)),
                            "error" => err = Some(pct_decode(v)),
                            _ => {}
                        }
                    }
                }
                let resp = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nAccess-Control-Allow-Origin: *\r\n\r\nOK";
                let _ = stream.write_all(resp);
                let _ = stream.flush();
                if let Some(e) = err {
                    if let Some(t) = tx_opt.take() {
                        let _ = t.send(Err(e));
                    }
                    break;
                }
                if let Some(tok) = token {
                    if let Some(t) = tx_opt.take() {
                        let _ = t.send(Ok(tok));
                    }
                    break;
                }
            } else if first_line.starts_with("GET /callback") {
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                    CALLBACK_HTML.len(),
                    CALLBACK_HTML
                );
                let _ = stream.write_all(resp.as_bytes());
                let _ = stream.flush();
            } else {
                let resp = b"HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot Found";
                let _ = stream.write_all(resp);
                let _ = stream.flush();
            }
        }
    });

    // Stash receiver — discord_oauth_await will pick it up.
    *state.0.lock().map_err(|e| e.to_string())? = Some(rx);
    Ok(port)
}

// Phase 2 — async wait for the callback token (up to 5 min).
// Using tokio::time::timeout + oneshot receiver so this command NEVER blocks
// a thread — the app stays fully responsive while the user authorizes in browser.
#[tauri::command]
async fn discord_oauth_await(state: tauri::State<'_, OAuthWaiter>) -> Result<String, String> {
    let rx = state
        .0
        .lock()
        .map_err(|e| e.to_string())?
        .take()
        .ok_or_else(|| "no pending OAuth flow — call discord_oauth_start first".to_string())?;

    match tokio::time::timeout(Duration::from_secs(300), rx).await {
        Ok(Ok(result)) => result, // result is Result<String, String>
        Ok(Err(_)) => Err("OAuth channel closed unexpectedly".to_string()),
        Err(_) => Err("timed out waiting for Discord authorization".to_string()),
    }
}

// Reveal a file in the OS file manager (Finder on macOS, Explorer on Windows).
// On Linux there's no universal "select this file" — fall back to opening the
// parent directory.
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        std::process::Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

// Open a path (file or directory) with the OS default handler. Used for
// "Open Downloads folder" — pass the directory path.
#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let prog = "open";
    #[cfg(target_os = "linux")]
    let prog = "xdg-open";

    #[cfg(target_os = "windows")]
    {
        return std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string());
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new(prog)
            .arg(&path)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

// Native folder picker. Returns the chosen path, or None if the user cancels.
// `default_path` (when provided) hints the dialog's starting directory.
#[tauri::command]
async fn pick_directory(default_path: Option<String>) -> Option<String> {
    let mut d = rfd::AsyncFileDialog::new();
    if let Some(p) = default_path {
        if !p.is_empty() {
            d = d.set_directory(p);
        }
    }
    d.pick_folder()
        .await
        .map(|h| h.path().to_string_lossy().to_string())
}

// Launch a separate `.app` bundle on macOS by name (e.g. "Hugin"). Falls back
// to a path-based open elsewhere — caller passes the full path on Windows/Linux.
// Returns the spawned process id (best-effort) or an error message.
#[tauri::command]
fn launch_app(name_or_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        // `open -a Hugin` finds the app in /Applications, ~/Applications, or
        // anywhere in Spotlight's app DB. If `name_or_path` looks like a path
        // (starts with /), pass it through `-a` too — open accepts both.
        std::process::Command::new("open")
            .args(["-a", &name_or_path])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &name_or_path])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new(&name_or_path)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

// Returns the OS user's Downloads directory (best-effort: $HOME/Downloads on
// macOS/Linux, %USERPROFILE%\Downloads on Windows). Used as the assumed save
// destination after the WebKit save dialog — we can't read the actual path
// the user picked, but the default lands here in the common case.
#[tauri::command]
fn default_download_dir() -> String {
    #[cfg(target_os = "windows")]
    let home = std::env::var_os("USERPROFILE");
    #[cfg(not(target_os = "windows"))]
    let home = std::env::var_os("HOME");

    if let Some(h) = home {
        let mut p = std::path::PathBuf::from(h);
        p.push("Downloads");
        return p.to_string_lossy().to_string();
    }
    String::from(".")
}

// Opens a URL in the system's default browser. We roll our own instead of
// depending on the JS shell plugin because the JS side here is plain <script>
// tags (no bundler), and reaching into the plugin's invoke path is fiddlier
// than just adding a trivial command.
//
// Windows: use explorer.exe rather than `cmd /C start` — explorer passes the
// URL directly to ShellExecute without cmd.exe's argument parsing, which avoids
// Discord OAuth URLs (containing & chars) being split at the & by the shell.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "windows")]
    {
        // rundll32 url.dll,FileProtocolHandler is the canonical Windows API for
        // opening a URL in the default browser — no shell parsing, no file manager.
        // explorer.exe would open Windows Explorer; cmd /C start parses & as a
        // command separator. rundll32 routes directly to ShellExecute.
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OAuthWaiter(Mutex::new(None)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            discord_oauth_start,
            discord_oauth_await,
            open_url,
            open_path,
            reveal_in_finder,
            default_download_dir,
            pick_directory,
            launch_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
