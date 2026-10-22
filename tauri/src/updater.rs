use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

const DEFAULT_TITLE: &str = "Rail Map Toolkit";
const RELEASES_URL: &str = "https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/latest";

pub fn spawn_check(app: AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(error) = check_and_install(app).await {
            eprintln!("Updater failed: {error}");
        }
    });
}

async fn check_and_install(app: AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let update = app
        .updater_builder()
        .timeout(Duration::from_secs(30))
        .build()?
        .check()
        .await?;
    let Some(update) = update else {
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
    let progress_window = window.clone();
    let mut downloaded = 0_u64;
    let download_result = update
        .download_and_install(
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

    if let Err(error) = download_result {
        set_title(&window, DEFAULT_TITLE);
        app.dialog()
            .message(format!(
                "The update could not be installed: {error}\n\nPlease download the latest version manually:\n{RELEASES_URL}"
            ))
            .title("Rail Map Toolkit Update Failed")
            .kind(MessageDialogKind::Error)
            .buttons(MessageDialogButtons::Ok)
            .blocking_show();
        return Ok(());
    }

    app.restart();
}

fn set_title(window: &Option<WebviewWindow>, title: &str) {
    if let Some(window) = window {
        let _ = window.set_title(title);
    }
}
