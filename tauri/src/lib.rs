#[cfg(any(target_os = "ios", target_os = "macos"))]
mod apple_export;
#[cfg(any(target_os = "ios", target_os = "macos"))]
mod apple_export_files;
#[cfg(target_os = "ios")]
mod apple_ios;
#[cfg(any(
    target_os = "ios",
    all(target_os = "macos", feature = "apple-bundle-assets")
))]
mod ios_assets;
mod resvg;
mod svg_transform;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![resvg::render_image]);

    #[cfg(any(target_os = "ios", target_os = "macos"))]
    let builder = builder
        .plugin(apple_export::init())
        .invoke_handler(tauri::generate_handler![
            resvg::render_image,
            apple_export::begin_file_export,
            apple_export::append_file_export,
            apple_export::finish_file_export,
            apple_export::abort_file_export,
            apple_export::show_file_export_error,
        ]);

    let context = tauri::generate_context!();
    #[cfg(any(
        target_os = "ios",
        all(target_os = "macos", feature = "apple-bundle-assets")
    ))]
    let context = {
        let mut context = context;
        context.set_assets(Box::new(ios_assets::BundleAssets::default()));
        context
    };
    #[cfg(any(
        target_os = "ios",
        all(target_os = "macos", feature = "apple-bundle-assets")
    ))]
    let builder = builder.setup(|app| {
        // Assets::setup resolves the bundle directory before this window loads.
        let window =
            tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?.build()?;
        #[cfg(target_os = "ios")]
        apple_ios::configure_viewport(&window)?;
        #[cfg(target_os = "macos")]
        let _ = window;
        Ok(())
    });

    builder
        .run(context)
        .expect("error while running tauri application");
}
