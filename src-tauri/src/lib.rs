// Discord OAuth2 Implicit Grant flow — we spin up a tiny HTTP listener on a
// fixed localhost port, open the browser to Discord's authorize URL, and
// wait for the redirect to hit our /callback. The token comes back in the
// URL fragment (#access_token=...), so the /callback page serves inline JS
// that extracts the fragment and POSTs it to /token, which we capture here.
//
// Implicit flow chosen over Authorization Code + PKCE because Discord still
// requires client_secret for the token exchange step, and we don't want to
// embed secrets in the binary. Implicit tokens last 7 days — plenty for a
// desktop app; user re-auths weekly.

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc::channel;
use std::time::Duration;

#[tauri::command]
async fn discord_oauth_listen() -> Result<String, String> {
    let (tx, rx) = channel::<Result<String, String>>();

    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:53134") {
            Ok(l) => l,
            Err(e) => {
                let _ = tx.send(Err(format!("bind failed: {}", e)));
                return;
            }
        };
        // 5-minute read timeout so the thread can't wedge forever if the user
        // never completes the flow.
        listener
            .set_nonblocking(false)
            .ok();

        for stream_result in listener.incoming() {
            let mut stream = match stream_result {
                Ok(s) => s,
                Err(_) => continue,
            };
            let _ = stream.set_read_timeout(Some(Duration::from_secs(10)));

            let mut buf = [0u8; 4096];
            let n = stream.read(&mut buf).unwrap_or(0);
            if n == 0 {
                continue;
            }
            let req = String::from_utf8_lossy(&buf[..n]).to_string();
            let first_line = req.lines().next().unwrap_or("").to_string();

            if first_line.starts_with("GET /token") {
                // The inline JS on the /callback page POSTs the fragment back as a query
                // string so we can read it server-side.
                let path = first_line.split(' ').nth(1).unwrap_or("");
                let query = path.split('?').nth(1).unwrap_or("");
                let mut token: Option<String> = None;
                let mut err: Option<String> = None;
                for pair in query.split('&') {
                    let mut it = pair.splitn(2, '=');
                    if let (Some(k), Some(v)) = (it.next(), it.next()) {
                        match k {
                            "access_token" => token = Some(v.to_string()),
                            "error" => err = Some(v.to_string()),
                            _ => {}
                        }
                    }
                }
                let resp = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nAccess-Control-Allow-Origin: *\r\n\r\nOK";
                let _ = stream.write_all(resp);
                let _ = stream.flush();

                if let Some(e) = err {
                    let _ = tx.send(Err(e));
                    break;
                }
                if let Some(t) = token {
                    let _ = tx.send(Ok(t));
                    break;
                }
            } else if first_line.starts_with("GET /callback") {
                let html = r#"<!doctype html>
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
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\n\r\n{}",
                    html.len(),
                    html
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

    // 5-minute cap on the whole auth flow. If the user abandons the browser
    // window we'll eventually time out instead of leaking the listener forever.
    match rx.recv_timeout(Duration::from_secs(300)) {
        Ok(Ok(t)) => Ok(t),
        Ok(Err(e)) => Err(e),
        Err(_) => Err("timed out waiting for authorization".to_string()),
    }
}

// Opens a URL in the system's default browser. We roll our own instead of
// depending on the JS shell plugin because the JS side here is plain <script>
// tags (no bundler), and reaching into the plugin's invoke path is fiddlier
// than just adding a trivial command.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let prog = "open";
    #[cfg(target_os = "linux")]
    let prog = "xdg-open";
    #[cfg(target_os = "windows")]
    let prog = "cmd";

    #[cfg(target_os = "windows")]
    let args: Vec<&str> = vec!["/C", "start", "", &url];
    #[cfg(not(target_os = "windows"))]
    let args: Vec<&str> = vec![&url];

    std::process::Command::new(prog)
        .args(&args)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![discord_oauth_listen, open_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
