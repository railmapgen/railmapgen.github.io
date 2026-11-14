use tauri::Manager;
#[cfg(not(any(target_os = "ios", target_os = "macos")))]
use tauri_plugin_dialog::DialogExt;

use resvg::{
    tiny_skia::{Color, Pixmap, Transform},
    usvg::{fontdb, Options, Tree},
};
use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::svg_transform::transform_svg;

#[tauri::command]
pub async fn render_image(
    app_handle: tauri::AppHandle,
    window: tauri::WebviewWindow,
    svg_string: String,
    scale: f32,
    is_transparent: bool,
    is_system_fonts_only: bool,
) -> Result<(), String> {
    let result = render_and_export(
        app_handle,
        &window,
        svg_string,
        scale,
        is_transparent,
        is_system_fonts_only,
    )
    .await;
    #[cfg(any(target_os = "ios", target_os = "macos"))]
    if let Err(error) = &result {
        // Older RMP bundles log command errors without displaying them.
        let _ = crate::apple_export::report_error(&window, error.clone()).await;
    }
    result
}

async fn render_and_export(
    app_handle: tauri::AppHandle,
    window: &tauri::WebviewWindow,
    svg_string: String,
    scale: f32,
    is_transparent: bool,
    is_system_fonts_only: bool,
) -> Result<(), String> {
    let png_bytes = tauri::async_runtime::spawn_blocking(move || {
        render_png(
            app_handle,
            svg_string,
            scale,
            is_transparent,
            is_system_fonts_only,
        )
    })
    .await
    .map_err(|error| format!("Image rendering failed: {error}"))??;
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let filename = format!("RMP_{timestamp}.png");

    #[cfg(any(target_os = "ios", target_os = "macos"))]
    crate::apple_export::export_bytes(window, &filename, "image/png", png_bytes).await?;

    #[cfg(not(any(target_os = "ios", target_os = "macos")))]
    {
        let (sender, mut receiver) = tauri::async_runtime::channel(1);
        window
            .dialog()
            .file()
            .set_file_name(&filename)
            .set_title("Save PNG")
            .save_file(move |path| {
                let _ = sender.try_send(path);
            });
        if let Some(path) = receiver
            .recv()
            .await
            .ok_or("The file save window closed unexpectedly")?
        {
            let path = path.into_path().map_err(|error| error.to_string())?;
            tauri::async_runtime::spawn_blocking(move || std::fs::write(path, png_bytes))
                .await
                .map_err(|error| error.to_string())?
                .map_err(|error| format!("Failed to write PNG file: {error}"))?;
        }
    }
    Ok(())
}

fn render_png(
    app_handle: tauri::AppHandle,
    svg_string: String,
    scale: f32,
    is_transparent: bool,
    is_system_fonts_only: bool,
) -> Result<Vec<u8>, String> {
    if !scale.is_finite() || scale <= 0.0 {
        return Err("Image scale must be a positive finite number".to_string());
    }
    let mut font_db_arc = Arc::new(fontdb::Database::new());
    let font_db = Arc::make_mut(&mut font_db_arc);

    // fontdb's directory scanner supports desktop platforms, but on iOS it
    // scans Linux paths. Core Text supplies the actual installed font URLs.
    #[cfg(target_os = "ios")]
    ios_fonts::load_system_fonts(font_db)?;
    #[cfg(not(target_os = "ios"))]
    font_db.load_system_fonts();

    if !is_system_fonts_only {
        // load fonts in case of missing in user system, default choice
        let resources_path = app_handle
            .path()
            .resource_dir()
            .map_err(|error| error.to_string())?;
        let fonts_path = resources_path.join("fonts");
        font_db.load_fonts_dir(&fonts_path);
    }
    remove_unrenderable_fonts(font_db);
    configure_generic_families(font_db)?;

    let myriad_pro_query = fontdb::Query {
        families: &[fontdb::Family::Name("Myriad Pro")],
        weight: fontdb::Weight(700),
        stretch: fontdb::Stretch::Normal,
        style: fontdb::Style::Normal,
    };
    let has_myriad = font_db.query(&myriad_pro_query).is_some();
    let transformed_svg = transform_svg(&svg_string, has_myriad);
    ensure_text_coverage(&transformed_svg, font_db, is_system_fonts_only)?;

    make_image(transformed_svg, font_db_arc, scale / 100f32, is_transparent)
}

fn ensure_text_coverage(
    svg: &str,
    db: &fontdb::Database,
    system_fonts_only: bool,
) -> Result<(), String> {
    use std::collections::BTreeSet;
    fn collect(element: &xmltree::Element, in_text: bool, characters: &mut BTreeSet<char>) {
        if matches!(element.name.as_str(), "title" | "desc") {
            return;
        }
        let in_text = in_text || element.name == "text";
        for child in &element.children {
            match child {
                xmltree::XMLNode::Element(child) => collect(child, in_text, characters),
                xmltree::XMLNode::Text(text) | xmltree::XMLNode::CData(text) if in_text => {
                    characters.extend(text.chars().filter(|character| {
                        !character.is_whitespace()
                            && !character.is_control()
                            && !matches!(*character,
                                '\u{200b}'..='\u{200f}' | '\u{202a}'..='\u{202e}' |
                                '\u{2060}'..='\u{206f}' | '\u{fe00}'..='\u{fe0f}' |
                                '\u{feff}' | '\u{e0000}'..='\u{e0fff}')
                    }));
                }
                _ => {}
            }
        }
    }
    let root = xmltree::Element::parse(svg.as_bytes()).map_err(|error| error.to_string())?;
    let mut missing = BTreeSet::new();
    collect(&root, false, &mut missing);
    for face in db.faces() {
        if missing.is_empty() {
            break;
        }
        db.with_face_data(face.id, |data, index| {
            if let Ok(font) = ttf_parser::Face::parse(data, index) {
                missing.retain(|character| font.glyph_index(*character).is_none());
            }
        });
    }
    if let Some(character) = missing.first() {
        let hint = if system_fonts_only {
            " Turn off 'System fonts only' to use the bundled fonts."
        } else {
            " No compatible font with this character is available."
        };
        return Err(format!(
            "The image renderer cannot draw '{character}' (U+{:04X}).{hint}",
            *character as u32
        ));
    }
    Ok(())
}

fn has_family(db: &fontdb::Database, family: fontdb::Family<'_>) -> bool {
    db.query(&fontdb::Query {
        families: &[family],
        ..fontdb::Query::default()
    })
    .is_some()
}

fn remove_unrenderable_fonts(db: &mut fontdb::Database) {
    // Recent Apple fonts can advertise a full cmap while storing outlines in
    // private tables (e.g. hvgl). usvg then selects a glyph but paints nothing,
    // so its missing-character fallback never runs. Keep only fonts whose
    // outlines, color bitmaps or SVG glyphs the renderer can actually read.
    let unsupported: Vec<_> = db
        .faces()
        .filter_map(|face| {
            // LastResort is a diagnostic box font, not real character coverage.
            if face
                .families
                .iter()
                .any(|(name, _)| name.contains("LastResort"))
            {
                return Some(face.id);
            }
            let renderable = db
                .with_face_data(face.id, |data, index| {
                    ttf_parser::Face::parse(data, index)
                        .map(|font| {
                            let tables = font.tables();
                            tables.glyf.is_some()
                                || tables.cff.is_some()
                                || tables.cff2.is_some()
                                || tables.svg.is_some()
                                || tables.sbix.is_some()
                                || tables.cbdt.is_some()
                                || tables.bdat.is_some()
                                || tables.ebdt.is_some()
                                || tables.colr.is_some()
                        })
                        .unwrap_or(false)
                })
                .unwrap_or(false);
            (!renderable).then_some(face.id)
        })
        .collect();
    for id in unsupported {
        db.remove_face(id);
    }
}

/// usvg falls back to `serif` before it attempts per-character fallback. Its
/// fontdb defaults name desktop fonts that may not exist on a mobile device or
/// in an offline bundle; an unresolved base face silently drops whole spans.
/// Keep existing generic mappings, and repair only those without a usable face.
fn configure_generic_families(db: &mut fontdb::Database) -> Result<(), String> {
    let first_family = db
        .faces()
        .flat_map(|face| face.families.iter())
        .next()
        .map(|(name, _)| name.clone())
        .ok_or("No usable fonts are available for image export")?;
    if !has_family(db, fontdb::Family::SansSerif) {
        let family = [
            "Arial",
            "Helvetica",
            "Helvetica Neue",
            "Vegur",
            "Roboto",
            "M PLUS 2",
            "Taipei Sans TC Beta",
        ]
        .into_iter()
        .find(|name| has_family(db, fontdb::Family::Name(name)))
        .unwrap_or(&first_family);
        db.set_sans_serif_family(family.to_string());
    }
    if !has_family(db, fontdb::Family::Serif) {
        let family = [
            "Times New Roman",
            "Times",
            "源樣明體",
            "GenYoMin TW",
            "Taipei Sans TC Beta",
            "M PLUS 2",
            "Vegur",
            "Roboto",
        ]
        .into_iter()
        .find(|name| has_family(db, fontdb::Family::Name(name)))
        .unwrap_or(&first_family);
        db.set_serif_family(family.to_string());
    }
    Ok(())
}

fn make_image(
    svg_string: String,
    font_db: Arc<fontdb::Database>,
    scale: f32,
    is_transparent: bool,
) -> Result<Vec<u8>, String> {
    let options = Options {
        fontdb: font_db,
        ..Options::default()
    };
    let tree = Tree::from_str(&svg_string, &options).map_err(|error| error.to_string())?;
    let pixmap_size = tree
        .size()
        .to_int_size()
        .scale_by(scale)
        .ok_or_else(|| "target size is zero".to_string())?;
    let mut pixmap = Pixmap::new(pixmap_size.width(), pixmap_size.height())
        .ok_or_else(|| "Failed to create pixel map (zero width/height?)".to_string())?;
    if !is_transparent {
        pixmap.fill(Color::WHITE);
    }
    resvg::render(
        &tree,
        Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );
    pixmap.encode_png().map_err(|error| error.to_string())
}

#[cfg(target_os = "ios")]
mod ios_fonts {
    //! Discover the system's actual font files through public CoreText APIs.
    //!
    //! fontdb's directory-based system discovery does not support iOS. CoreText
    //! supplies file URLs for fonts available to this application without relying
    //! on private directory layouts or installing/downloading additional fonts.

    use std::{
        collections::BTreeSet,
        ffi::{c_char, c_void, CStr},
        path::PathBuf,
        ptr::{self, NonNull},
    };

    type CfRef = *const c_void;
    const UTF8_ENCODING: u32 = 0x0800_0100;
    const POSIX_PATH_STYLE: isize = 0;

    #[link(name = "CoreText", kind = "framework")]
    unsafe extern "C" {
        fn CTFontCollectionCreateFromAvailableFonts(options: CfRef) -> CfRef;
        fn CTFontCollectionCreateMatchingFontDescriptors(collection: CfRef) -> CfRef;
        fn CTFontDescriptorCopyAttribute(descriptor: CfRef, attribute: CfRef) -> CfRef;
        static kCTFontURLAttribute: CfRef;
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" {
        fn CFRelease(value: CfRef);
        fn CFGetTypeID(value: CfRef) -> usize;
        fn CFArrayGetCount(array: CfRef) -> isize;
        fn CFArrayGetValueAtIndex(array: CfRef, index: isize) -> CfRef;
        fn CFURLGetTypeID() -> usize;
        fn CFURLCopyFileSystemPath(url: CfRef, path_style: isize) -> CfRef;
        fn CFStringGetLength(string: CfRef) -> isize;
        fn CFStringGetMaximumSizeForEncoding(length: isize, encoding: u32) -> isize;
        fn CFStringGetCString(
            string: CfRef,
            buffer: *mut c_char,
            buffer_size: isize,
            encoding: u32,
        ) -> u8;
    }

    /// An owned Create/Copy reference. Borrowed array entries never enter this wrapper.
    struct OwnedCf(NonNull<c_void>);

    impl OwnedCf {
        /// The caller must pass a retained Create/Copy result, or null.
        unsafe fn from_retained(value: CfRef) -> Option<Self> {
            NonNull::new(value.cast_mut()).map(Self)
        }

        fn as_ptr(&self) -> CfRef {
            self.0.as_ptr()
        }
    }

    impl Drop for OwnedCf {
        fn drop(&mut self) {
            // SAFETY: from_retained accepts only owned, nonnull CF references.
            unsafe { CFRelease(self.as_ptr()) };
        }
    }

    fn file_path(url: &OwnedCf) -> Option<PathBuf> {
        // CTFontDescriptorCopyAttribute returns CFTypeRef; verify its concrete type
        // before treating it as a URL. Both Copy results are released on every exit.
        if unsafe { CFGetTypeID(url.as_ptr()) != CFURLGetTypeID() } {
            return None;
        }
        let path = unsafe {
            OwnedCf::from_retained(CFURLCopyFileSystemPath(url.as_ptr(), POSIX_PATH_STYLE))
        }?;
        let length = unsafe { CFStringGetLength(path.as_ptr()) };
        let capacity =
            unsafe { CFStringGetMaximumSizeForEncoding(length, UTF8_ENCODING) }.checked_add(1)?;
        let mut bytes = vec![0; usize::try_from(capacity).ok()?];
        if unsafe {
            CFStringGetCString(
                path.as_ptr(),
                bytes.as_mut_ptr().cast::<c_char>(),
                capacity,
                UTF8_ENCODING,
            )
        } == 0
        {
            return None;
        }
        let text = CStr::from_bytes_until_nul(&bytes).ok()?.to_str().ok()?;
        let path = PathBuf::from(text);
        path.is_absolute().then_some(path)
    }

    /// Load the fonts currently available to the application into a fontdb database.
    ///
    /// No system directories are guessed. Multiple descriptors for a collection or
    /// variable font share one file read. Individual unavailable files are tolerated
    /// when other fonts load; an empty result fails rather than producing a blank PNG.
    pub fn load_system_fonts(db: &mut resvg::usvg::fontdb::Database) -> Result<(), String> {
        // SAFETY: CoreText accepts null options and returns retained CF references.
        // Its font-collection APIs and kCTFontURLAttribute are public since iOS 3.2.
        let collection = unsafe {
            OwnedCf::from_retained(CTFontCollectionCreateFromAvailableFonts(ptr::null()))
        }
        .ok_or("CoreText could not create the iOS system font collection")?;
        let descriptors = unsafe {
            OwnedCf::from_retained(CTFontCollectionCreateMatchingFontDescriptors(
                collection.as_ptr(),
            ))
        }
        .ok_or("CoreText found no iOS system font descriptors")?;
        let count = unsafe { CFArrayGetCount(descriptors.as_ptr()) };
        if count <= 0 {
            return Err("CoreText found no iOS system font descriptors".to_string());
        }

        let mut paths = BTreeSet::new();
        for index in 0..count {
            // Entries are borrowed CTFontDescriptors kept alive by the retained array.
            let descriptor = unsafe { CFArrayGetValueAtIndex(descriptors.as_ptr(), index) };
            if descriptor.is_null() {
                continue;
            }
            let url = unsafe {
                OwnedCf::from_retained(CTFontDescriptorCopyAttribute(
                    descriptor,
                    kCTFontURLAttribute,
                ))
            };
            if let Some(path) = url.as_ref().and_then(file_path) {
                paths.insert(path);
            }
        }
        if paths.is_empty() {
            return Err("CoreText provided no usable iOS system font file URLs".to_string());
        }

        let file_count = paths.len();
        let initial_faces = db.faces().count();
        let mut first_error = None;
        for path in paths {
            if let Err(error) = db.load_font_file(&path) {
                first_error.get_or_insert_with(|| error.to_string());
            }
        }
        if db.faces().count() == initial_faces {
            let detail = first_error
                .map(|error| format!(": {error}"))
                .unwrap_or_default();
            return Err(format!(
                "No iOS system font faces could be loaded from {file_count} CoreText font files{detail}"
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use resvg::{tiny_skia::Pixmap, usvg::fontdb};
    use std::{path::PathBuf, sync::Arc};

    // Deliberately omit load_system_fonts: desktop fonts would mask the empty
    // generic-family mappings that caused text to disappear on iOS.
    fn bundled_fonts() -> fontdb::Database {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let mut database = fontdb::Database::new();
        database.load_fonts_dir(root.join("public/fonts"));
        database.load_fonts_dir(root.join("tauri/ui/rmp/fonts"));
        assert!(query(&database, fontdb::Family::Name("Vegur")).is_some());
        assert!(query(&database, fontdb::Family::Name("源樣明體")).is_some());
        database
    }

    fn query(database: &fontdb::Database, family: fontdb::Family<'_>) -> Option<fontdb::ID> {
        database.query(&fontdb::Query {
            families: &[family],
            ..fontdb::Query::default()
        })
    }

    fn text_svg(family: Option<&str>, text: &str) -> String {
        let family = family
            .map(|value| format!(" font-family=\"{value}\""))
            .unwrap_or_default();
        format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"500\" height=\"80\">\
             <text x=\"10\" y=\"55\" font-size=\"36\"{family}>{text}</text></svg>"
        )
    }

    fn rendered(database: &fontdb::Database, family: Option<&str>, text: &str) -> Pixmap {
        let png = make_image(
            text_svg(family, text),
            Arc::new(database.clone()),
            1.0,
            true,
        )
        .expect("The SVG should render to PNG");
        let image = Pixmap::decode_png(&png).expect("The exported bytes should be a valid PNG");
        assert_eq!((image.width(), image.height()), (500, 80));
        image
    }

    fn painted_pixels(image: &Pixmap) -> usize {
        image
            .pixels()
            .iter()
            .filter(|pixel| pixel.alpha() != 0)
            .count()
    }

    #[test]
    fn bundled_fonts_without_generic_configuration_reproduce_missing_text() {
        let database = bundled_fonts();
        assert!(query(&database, fontdb::Family::SansSerif).is_none());
        assert!(query(&database, fontdb::Family::Serif).is_none());
        for (family, text) in [
            ("Arial, sans-serif", "Shanghai"),
            ("SimHei, 'STHeiti T0C', 'PingFang SC', sans-serif", "上海"),
        ] {
            assert_eq!(
                painted_pixels(&rendered(&database, Some(family), text)),
                0,
                "The unfixed font selector should reproduce the missing {text} pixels"
            );
        }
        // Verify that this reproducer loaded usable fonts, rather than relying on
        // an empty database that could not render any text at all.
        assert!(painted_pixels(&rendered(&database, Some("Vegur"), "Shanghai")) > 0);
    }

    #[test]
    fn configured_bundled_fonts_render_english_and_chinese_text() {
        let mut database = bundled_fonts();
        configure_generic_families(&mut database).unwrap();
        assert!(query(&database, fontdb::Family::SansSerif).is_some());
        assert!(query(&database, fontdb::Family::Serif).is_some());
        for (family, text) in [
            ("Arial, sans-serif", "Shanghai"),
            ("SimHei, 'STHeiti T0C', 'PingFang SC', sans-serif", "上海"),
        ] {
            assert!(
                painted_pixels(&rendered(&database, Some(family), text)) > 0,
                "The configured fallback should paint {text}"
            );
        }
    }

    #[test]
    fn unknown_named_family_uses_a_loaded_fallback() {
        let mut database = bundled_fonts();
        configure_generic_families(&mut database).unwrap();
        for text in ["Uninstalled font", "中文站名"] {
            assert!(
                painted_pixels(&rendered(
                    &database,
                    Some("RMT Deliberately Uninstalled Font"),
                    text,
                )) > 0
            );
        }
    }

    #[test]
    fn text_without_an_explicit_family_uses_a_loaded_fallback() {
        let mut database = bundled_fonts();
        configure_generic_families(&mut database).unwrap();
        for text in ["Default family", "默认字体"] {
            assert!(painted_pixels(&rendered(&database, None, text)) > 0);
        }
    }

    #[test]
    fn existing_generic_family_mappings_are_preserved() {
        let mut database = bundled_fonts();
        database.set_serif_family("源樣明體");
        database.set_sans_serif_family("Vegur");
        database.set_cursive_family("Vegur");
        database.set_fantasy_family("源樣明體");
        database.set_monospace_family("Vegur");
        let families = [
            fontdb::Family::Serif,
            fontdb::Family::SansSerif,
            fontdb::Family::Cursive,
            fontdb::Family::Fantasy,
            fontdb::Family::Monospace,
        ];
        let before: Vec<_> = families
            .iter()
            .map(|family| {
                (
                    database.family_name(family).to_owned(),
                    query(&database, *family).unwrap(),
                )
            })
            .collect();
        configure_generic_families(&mut database).unwrap();
        for (family, (name, id)) in families.iter().zip(before) {
            assert_eq!(database.family_name(family), name);
            assert_eq!(query(&database, *family), Some(id));
        }
    }

    #[test]
    fn an_available_explicit_font_keeps_its_identity_and_pixels() {
        let mut database = bundled_fonts();
        let before_id = query(&database, fontdb::Family::Name("Vegur")).unwrap();
        let before_image = rendered(&database, Some("Vegur"), "Rail Map Toolkit");
        assert!(painted_pixels(&before_image) > 0);
        configure_generic_families(&mut database).unwrap();
        assert_eq!(
            query(&database, fontdb::Family::Name("Vegur")),
            Some(before_id)
        );
        let after_image = rendered(&database, Some("Vegur"), "Rail Map Toolkit");
        assert_eq!(before_image.data(), after_image.data());
    }

    #[test]
    fn empty_font_database_reports_an_error_instead_of_silent_text_loss() {
        let mut database = fontdb::Database::new();
        assert!(configure_generic_families(&mut database).is_err());
    }

    #[test]
    fn font_with_cmap_but_unsupported_outlines_does_not_block_fallback() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
        let mut bytes = std::fs::read(root.join("public/fonts/Vegur-Regular.ttf")).unwrap();
        let count = u16::from_be_bytes([bytes[4], bytes[5]]) as usize;
        let glyph_table = (0..count)
            .map(|index| 12 + index * 16)
            .find(|offset| &bytes[*offset..*offset + 4] == b"glyf")
            .unwrap();
        // Reproduce Apple's private-outline fonts without shipping their data:
        // retain cmap/name/metrics but make the outlines unreadable to resvg.
        bytes[glyph_table..glyph_table + 4].copy_from_slice(b"hvgl");
        let mut database = fontdb::Database::new();
        database.load_font_data(bytes);
        database
            .load_font_file(root.join("public/fonts/GenYoMin-TW-SB.ttf"))
            .unwrap();
        let unsupported = query(&database, fontdb::Family::Name("Vegur")).unwrap();
        assert!(database
            .with_face_data(unsupported, |data, index| {
                ttf_parser::Face::parse(data, index)
                    .unwrap()
                    .glyph_index('A')
                    .is_some()
            })
            .unwrap());
        configure_generic_families(&mut database).unwrap();
        assert_eq!(
            painted_pixels(&rendered(&database, Some("Vegur"), "A Metro")),
            0
        );
        remove_unrenderable_fonts(&mut database);
        configure_generic_families(&mut database).unwrap();
        assert!(database.face(unsupported).is_none());
        for text in ["A Metro", "上海地铁"] {
            assert!(painted_pixels(&rendered(&database, Some("Vegur"), text)) > 0);
        }
    }

    #[test]
    fn missing_characters_fail_instead_of_exporting_incomplete_labels() {
        let database = bundled_fonts();
        let svg = text_svg(None, "Shanghai 上海地铁");
        ensure_text_coverage(&svg, &database, false).unwrap();
        let missing = text_svg(None, "\u{10ffff}");
        let error = ensure_text_coverage(&missing, &database, true).unwrap_err();
        assert!(error.contains("U+10FFFF"));
        assert!(error.contains("System fonts only"));
    }

    #[test]
    fn nonvisual_svg_content_does_not_require_font_glyphs() {
        let database = bundled_fonts();
        let svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><title>\u{10ffff}</title>\
            <style>/* \u{10ffff} */</style><text>A<tspan> 上海\u{200d}\u{fe0f}</tspan></text></svg>";
        ensure_text_coverage(svg, &database, false).unwrap();
    }
}
