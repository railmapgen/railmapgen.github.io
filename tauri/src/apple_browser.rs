//! Route external web pages to the iOS application browser.

use tauri::{
    async_runtime::channel,
    plugin::{Builder, TauriPlugin},
    Url, Webview,
};

fn is_application_url(url: &Url) -> bool {
    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (matches!(url.scheme(), "http" | "https") && url.host_str() == Some("tauri.localhost"))
}

fn is_external_url(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https") && !is_application_url(url)
}

pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("ios-browser")
        .js_init_script_on_all_frames(include_str!("apple-browser.js"))
        .on_navigation(|webview, url| {
            if !is_external_url(url) {
                return true;
            }
            // Cover direct location changes as well as the anchor/window.open
            // paths handled by the document-start adapter.
            if let Err(error) =
                crate::apple_ios::present_browser(webview.clone(), url.to_string(), |result| {
                    if let Err(error) = result {
                        eprintln!("Could not open the application browser: {error}");
                    }
                })
            {
                eprintln!("Could not schedule the application browser: {error}");
            }
            false
        })
        .build()
}

// This is an application command: plugin commands require a separate ACL
// manifest even for an in-process plugin. Only our bundled host may invoke it.
#[tauri::command]
pub async fn open_url(webview: Webview, url: String) -> Result<(), String> {
    let origin = webview.url().map_err(|error| error.to_string())?;
    if !is_application_url(&origin) {
        return Err("The application browser is only available to bundled pages".into());
    }
    let url = Url::parse(&url).map_err(|error| format!("Invalid browser URL: {error}"))?;
    if !is_external_url(&url) {
        return Err("The application browser requires an external HTTP or HTTPS URL".into());
    }
    let (sender, mut receiver) = channel(1);
    crate::apple_ios::present_browser(webview, url.to_string(), move |result| {
        let _ = sender.try_send(result);
    })
    .map_err(|error| error.to_string())?;
    receiver
        .recv()
        .await
        .ok_or_else(|| "The application browser closed before opening".to_string())?
}
