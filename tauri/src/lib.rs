#[cfg(target_os = "ios")]
mod apple_browser;
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
#[cfg(all(desktop, not(feature = "apple-bundle-assets")))]
mod updater;
#[cfg(all(desktop, not(feature = "apple-bundle-assets")))]
mod updater_download;

#[cfg(any(
    target_os = "ios",
    all(target_os = "macos", feature = "apple-bundle-assets")
))]
unsafe extern "C" {
    fn RMTRegisterSubscriptionsWebView(webview: *mut std::ffi::c_void);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![resvg::render_image]);

    #[cfg(all(desktop, not(feature = "apple-bundle-assets")))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

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
            #[cfg(target_os = "ios")]
            apple_browser::open_url,
        ]);

    #[cfg(target_os = "ios")]
    let builder = builder.plugin(apple_browser::init());

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
    let builder = builder.setup(|app| {
        #[cfg(any(
            target_os = "ios",
            all(target_os = "macos", feature = "apple-bundle-assets")
        ))]
        {
            // Assets::setup resolves the bundle directory before this window loads.
            let window =
                tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                    .build()?;
            #[cfg(target_os = "ios")]
            apple_ios::configure_viewport(&window)?;
            window.with_webview(|webview| {
                // SAFETY: Tauri supplies the live WKWebView on the UI thread.
                // Swift retains its handler and only weakly references the view.
                unsafe { RMTRegisterSubscriptionsWebView(webview.inner().cast()) };
            })?;
        }
        #[cfg(all(desktop, not(feature = "apple-bundle-assets")))]
        updater::spawn_check(app.handle().clone());
        Ok(())
    });

    builder
        .run(context)
        .expect("error while running tauri application");
}
