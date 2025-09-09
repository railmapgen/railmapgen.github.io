use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use resvg::{
    tiny_skia::{Color, Pixmap, Transform},
    usvg::{fontdb, Options, Tree},
};
use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

#[tauri::command]
pub async fn render_image(
    app_handle: tauri::AppHandle,
    svg_string: String,
    scale: f32,
    is_transparent: bool,
    is_system_fonts_only: bool,
) {
    let mut font_db_arc = Arc::new(fontdb::Database::new());
    let font_db = Arc::make_mut(&mut font_db_arc);

    // always load system fonts to match the browser behavior
    font_db.load_system_fonts();

    if !is_system_fonts_only {
        // load fonts in case of missing in user system, default choice
        let resources_path = app_handle.path().resource_dir().unwrap();
        let fonts_path = resources_path.join("fonts");
        font_db.load_fonts_dir(&fonts_path);
    }

    // Workaround for MTR fonts, they are using postscript font names
    // and the fontdb does not support them, so we need to replace them with
    // the correct font family names.
    let mut replaced_svg_string = svg_string.replace(
            "font-family=\"GenYoMinTW-SB, HiraMinProN-W6, Vegur-Bold, Helvetica, serif\"",
            "font-family=\"源樣明體\"",
        );
    let myriad_pro_query = fontdb::Query {
        families: &[fontdb::Family::Name("Myriad Pro")],
        weight: fontdb::Weight(700),
        stretch: fontdb::Stretch::Normal,
        style: fontdb::Style::Normal,
    };
    let myriad_pro_id = font_db.query(&myriad_pro_query);
    let replaced_to_mtr_en = if myriad_pro_id.is_some() {
        "font-family=\"Myriad Pro\" font-weight=\"600\""
    } else {
        "font-family=\"Vegur\" font-weight=\"700\""
    };
    replaced_svg_string = replaced_svg_string.replace(
        "font-family=\"MyriadPro-Semibold, Vegur-Bold, Helvetica, sans-serif\"",
        replaced_to_mtr_en,
    );

    // render the SVG string to a PNG image
    let png_bytes = make_image(replaced_svg_string, font_db_arc, scale / 100f32, is_transparent)
        .expect("Failed to convert SVG to PNG");
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();

    // save the PNG image to a file
    app_handle
        .dialog()
        .file()
        .set_file_name(&format!("RMP_{}.png", timestamp))
        .set_title("Save PNG")
        .save_file(|file_path| {
            if let Some(valid_path) = file_path {
                if let Some(path) = valid_path.as_path() {
                    std::fs::write(path, png_bytes).expect("Failed to write PNG file");
                }
            }
        });
}

fn make_image(
    svg_string: String,
    font_db: Arc<fontdb::Database>,
    scale: f32,
    is_transparent: bool,
) -> Result<Vec<u8>, String> {
    // Use default options, but provide the loaded font database.
    let options = Options {
        fontdb: font_db,
        ..Options::default()
    };

    // Parse the XML string into a usvg Tree structure.
    let tree = Tree::from_str(&svg_string, &options).map_err(|e| e.to_string())?;

    // Calculate the pixel size based on the SVG's size information.
    let pixmap_size = tree
        .size()
        .to_int_size()
        .scale_by(scale)
        .ok_or_else(|| "target size is zero".to_string())?;
    let mut pixmap = Pixmap::new(pixmap_size.width(), pixmap_size.height())
        .ok_or_else(|| "Failed to create pixel map (zero width/height?)".to_string())?;

    // Fill the pixel map with a white background if needed.
    if !is_transparent {
        pixmap.fill(Color::WHITE);
    }

    // Render the usvg Tree onto the pixel map.
    resvg::render(
        &tree,
        Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );

    // Encode the pixel map into PNG bytes.
    pixmap.encode_png().map_err(|e| e.to_string())
}
