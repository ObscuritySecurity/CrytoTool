// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebKitGTK runtime workarounds for Linux AppImage + Wayland EGL issues.
    // Belt-and-suspenders alongside the truly-portable AppImage built by
    // quick-sharun in .github/workflows/tauri-linux.yml. See:
    //   https://github.com/tauri-apps/tauri/issues/11994
    //   https://github.com/tauri-apps/tauri/issues/15050
    //   https://bugs.webkit.org/show_bug.cgi?id=280239
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
