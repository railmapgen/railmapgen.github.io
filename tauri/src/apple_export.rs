//! Apple exports share a single presentation queue, whether the bytes came
//! from an iframe download or the native SVG renderer.
use std::sync::Mutex;

use serde::Serialize;
use tauri::{
    async_runtime::{channel, Mutex as AsyncMutex},
    ipc::{InvokeBody, Request},
    plugin::{Builder, TauriPlugin},
    Manager, State, WebviewWindow,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use crate::apple_export_files::{ExportFile, ExportFiles, MAX_CHUNK_SIZE};

pub struct ExportState {
    files: Mutex<ExportFiles>,
    presentation: AsyncMutex<()>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportStatus {
    Completed,
    Cancelled,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    status: ExportStatus,
}

impl ExportResult {
    fn new(completed: bool) -> Self {
        Self {
            status: if completed {
                ExportStatus::Completed
            } else {
                ExportStatus::Cancelled
            },
        }
    }
}

pub fn init() -> TauriPlugin<tauri::Wry> {
    Builder::new("apple-export")
        .js_init_script_on_all_frames(include_str!("apple-export.js"))
        .setup(|app, _| {
            let root = app.path().app_cache_dir()?.join("native-exports");
            let files = ExportFiles::new(root)
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
            app.manage(ExportState {
                files: Mutex::new(files),
                presentation: AsyncMutex::new(()),
            });
            Ok(())
        })
        .build()
}

#[tauri::command]
pub fn begin_file_export(
    state: State<'_, ExportState>,
    filename: String,
    mime_type: String,
) -> Result<String, String> {
    state
        .files
        .lock()
        .map_err(|_| "Export storage is unavailable".to_string())?
        .begin(&filename, &mime_type)
}

#[tauri::command]
pub fn append_file_export(
    state: State<'_, ExportState>,
    request: Request<'_>,
) -> Result<(), String> {
    let id = request
        .headers()
        .get("x-rmt-export-id")
        .and_then(|value| value.to_str().ok())
        .ok_or("Missing export session")?;
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) => bytes,
        _ => return Err("Export chunks must contain binary data".to_string()),
    };
    state
        .files
        .lock()
        .map_err(|_| "Export storage is unavailable".to_string())?
        .append(id, bytes)
}

#[tauri::command]
pub fn abort_file_export(state: State<'_, ExportState>, export_id: String) -> Result<(), String> {
    state
        .files
        .lock()
        .map_err(|_| "Export storage is unavailable".to_string())?
        .abort(&export_id)
}

#[tauri::command]
pub async fn finish_file_export(
    window: WebviewWindow,
    state: State<'_, ExportState>,
    export_id: String,
) -> Result<ExportResult, String> {
    let file = state
        .files
        .lock()
        .map_err(|_| "Export storage is unavailable".to_string())?
        .finish(&export_id)?;
    present_file(&window, &state, file).await
}

pub async fn export_bytes(
    window: &WebviewWindow,
    filename: &str,
    mime_type: &str,
    bytes: Vec<u8>,
) -> Result<ExportResult, String> {
    let state = window.state::<ExportState>();
    let file = {
        let mut files = state
            .files
            .lock()
            .map_err(|_| "Export storage is unavailable".to_string())?;
        let id = files.begin(filename, mime_type)?;
        for chunk in bytes.chunks(MAX_CHUNK_SIZE) {
            files.append(&id, chunk)?;
        }
        files.finish(&id)?
    };
    // Release the potentially large encoded image before opening native UI.
    drop(bytes);
    present_file(window, &state, file).await
}

async fn present_file(
    window: &WebviewWindow,
    state: &ExportState,
    file: ExportFile,
) -> Result<ExportResult, String> {
    let _presentation = state.presentation.lock().await;
    #[cfg(target_os = "ios")]
    let completed = {
        let (sender, mut receiver) = channel(1);
        crate::apple_ios::present_export(
            window.clone(),
            file.path.clone(),
            file.mime_type.clone(),
            move |result| {
                let _ = sender.try_send(result);
            },
        )
        .map_err(|error| error.to_string())?;
        receiver
            .recv()
            .await
            .ok_or("The sharing window closed unexpectedly")??
    };
    #[cfg(target_os = "macos")]
    let completed = {
        let (sender, mut receiver) = channel(1);
        window
            .dialog()
            .file()
            .set_parent(window)
            .set_file_name(&file.filename)
            .save_file(move |path| {
                let _ = sender.try_send(path);
            });
        let destination = receiver
            .recv()
            .await
            .ok_or("The file save window closed unexpectedly")?;
        if let Some(destination) = destination {
            let path = destination.into_path().map_err(|error| error.to_string())?;
            let source = file.path.clone();
            tauri::async_runtime::spawn_blocking(move || std::fs::copy(&source, &path).map(|_| ()))
                .await
                .map_err(|error| error.to_string())?
                .map_err(|error| format!("Could not save the exported file: {error}"))?;
            true
        } else {
            false
        }
    };
    // ExportFile owns its temporary directory, including on every error path.
    drop(file);
    Ok(ExportResult::new(completed))
}

#[tauri::command]
pub async fn show_file_export_error(window: WebviewWindow, message: String) -> Result<(), String> {
    report_error(&window, message).await
}

pub async fn report_error(window: &WebviewWindow, message: String) -> Result<(), String> {
    let state = window.state::<ExportState>();
    let _presentation = state.presentation.lock().await;
    let (sender, mut receiver) = channel(1);
    window
        .dialog()
        .message(message)
        .title("Export failed")
        .kind(MessageDialogKind::Error)
        .show(move |_| {
            let _ = sender.try_send(());
        });
    receiver
        .recv()
        .await
        .ok_or_else(|| "The error dialog closed unexpectedly".to_string())
}
