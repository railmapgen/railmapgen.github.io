use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::{Config, Error as UpdaterError, Update, UpdaterExt};

use crate::updater_download::download_urls;

const DEFAULT_TITLE: &str = "Rail Map Toolkit";
const RELEASES_URL: &str = "https://gh.monlor.com/https://github.com/railmapgen/railmapgen.github.io/releases/latest";
const GITHUB_RELEASES_URL: &str = "https://github.com/railmapgen/railmapgen.github.io/releases/latest";

pub fn spawn_check(app: AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(error) = check_and_install(app).await {
            eprintln!("Updater failed: {error:?}");
        }
    });
}

async fn check_and_install(app: AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let update = check_update(&app).await?;
    let Some(mut update) = update else {
        return Ok(());
    };

    let current_version = app.package_info().version.to_string();
    let latest_version = update.version.clone();
    let dialog_app = app.clone();
    let confirmed = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .message(format!(
                "A new version of Rail Map Toolkit is available.\n\nCurrent version: {current_version}\nLatest version: {latest_version}\n\nUpdate now? The application will restart after installation."
            ))
            .title("Rail Map Toolkit Update")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Update now".to_string(),
                "Later".to_string(),
            ))
            .blocking_show()
    })
    .await
    .unwrap_or(false);

    if !confirmed {
        return Ok(());
    }

    let window = app.get_webview_window("main");
    let install_result = match download_update(&mut update, &window).await {
        Ok(bytes) => {
            set_title(&window, &format!("{DEFAULT_TITLE} - Installing update..."));
            // Download verifies the signature. Install once, after a successful download.
            update.install(bytes).map_err(|error| error.to_string())
        }
        Err(error) => Err(error),
    };

    if let Err(error) = install_result {
        set_title(&window, DEFAULT_TITLE);
        app.dialog()
            .message(format!(
                "The update could not be installed: {error}\n\nPlease download the latest version manually:\n{RELEASES_URL}\n\nGitHub:\n{GITHUB_RELEASES_URL}"
            ))
            .title("Rail Map Toolkit Update Failed")
            .kind(MessageDialogKind::Error)
            .buttons(MessageDialogButtons::Ok)
            .blocking_show();
        return Ok(());
    }

    app.restart();
}

async fn check_update(
    app: &AppHandle,
) -> Result<Option<Update>, Box<dyn std::error::Error + Send + Sync>> {
    let config: Config = serde_json::from_value(
        app.config()
            .plugins
            .0
            .get("updater")
            .cloned()
            .ok_or("Updater configuration is missing")?,
    )?;
    let mut last_error = UpdaterError::EmptyEndpoints;
    for endpoint in config.endpoints {
        // Check each endpoint separately so invalid mirror JSON also triggers fallback.
        let result = app
            .updater_builder()
            .endpoints(vec![endpoint.clone()])?
            .timeout(Duration::from_secs(30))
            .configure_client(|client| {
                client
                    .connect_timeout(Duration::from_secs(15))
                    .read_timeout(Duration::from_secs(60))
            })
            .build()?
            .check()
            .await;
        match result {
            Ok(update) => return Ok(update),
            Err(error) => {
                eprintln!("Update check failed for {endpoint}: {error:?}");
                last_error = error;
            }
        }
    }
    Err(last_error.into())
}

async fn download_update(
    update: &mut Update,
    window: &Option<WebviewWindow>,
) -> Result<Vec<u8>, String> {
    let mut errors = Vec::new();
    for url in download_urls(update.download_url.as_str()) {
        update.download_url = url
            .parse()
            .map_err(|error| format!("Invalid update download URL: {error}"))?;
        let progress_window = window.clone();
        let mut downloaded = 0_u64;
        set_title(window, &format!("{DEFAULT_TITLE} - Downloading update..."));
        let result = update
            .download(
                move |chunk_length, content_length| {
                    downloaded += chunk_length as u64;
                    let title = match content_length {
                        Some(total) if total > 0 => format!(
                            "{DEFAULT_TITLE} - Downloading update {}%",
                            downloaded.saturating_mul(100) / total
                        ),
                        _ => format!("{DEFAULT_TITLE} - Downloading update..."),
                    };
                    set_title(&progress_window, &title);
                },
                || {},
            )
            .await;
        match result {
            Ok(bytes) => return Ok(bytes),
            Err(error) => {
                eprintln!("Update download failed for {url}: {error:?}");
                errors.push(format!("{url}: {error}"));
            }
        }
    }
    Err(errors.join("\n"))
}

fn set_title(window: &Option<WebviewWindow>, title: &str) {
    if let Some(window) = window {
        let _ = window.set_title(title);
    }
}
