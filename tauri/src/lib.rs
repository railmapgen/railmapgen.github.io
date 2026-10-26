mod resvg;
mod svg_transform;
#[cfg(target_os = "ios")]
mod ios_assets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![resvg::render_image]);

    let context = tauri::generate_context!();
    #[cfg(target_os = "ios")]
    let context = {
        let mut context = context;
        context.set_assets(Box::new(ios_assets::BundleAssets::default()));
        context
    };
    #[cfg(target_os = "ios")]
    let builder = builder.setup(|app| {
        // Assets::setup resolves the bundle directory before this window loads.
        tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?.build()?;
        Ok(())
    });

    builder
        .run(context)
        .expect("error while running tauri application");
}
