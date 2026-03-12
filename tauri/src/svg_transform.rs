use std::io::Cursor;
use xmltree::{Element, EmitterConfig, XMLNode};

// Do some dom transformation on the SVG string.
pub fn transform_svg(svg: &str, has_myriad: bool) -> String {
    let mut root = match Element::parse(Cursor::new(svg.as_bytes())) {
        Ok(root) => root,
        // Preserve export behavior if the SVG contains markup we cannot round-trip safely.
        Err(_) => return svg.to_string(),
    };

    // Workaround for MTR fonts, they are using postscript font names
    // and the fontdb does not support them, so we need to replace them with
    // the correct font family names.
    replace_font_attributes(&mut root, has_myriad);

    let mut output = Vec::new();
    let config = EmitterConfig::new().write_document_declaration(false);

    if root.write_with_config(&mut output, config).is_err() {
        // Rendering the original SVG is safer than emitting a partially serialized document.
        return svg.to_string();
    }

    String::from_utf8(output).unwrap_or_else(|_| svg.to_string())
}

// Map the postscript font name to the font family accepted by resvg.
fn replace_font_attributes(element: &mut Element, has_myriad: bool) {
    if let Some(font_family) = element.attributes.get("font-family").cloned() {
        if font_family.contains("MyriadPro-Semibold") {
            let (new_family, new_weight) = if has_myriad {
                // try official fonts first
                ("Myriad Pro", "600")
            } else {
                // then fallback to the provided open font
                ("Vegur", "700")
            };

            element
                .attributes
                .insert("font-family".to_string(), new_family.to_string());
            element
                .attributes
                .insert("font-weight".to_string(), new_weight.to_string());
        } else if font_family.contains("GenYoMinTW-SB") {
            element
                .attributes
                .insert("font-family".to_string(), "源樣明體".to_string());
        }
    }

    for child in &mut element.children {
        if let XMLNode::Element(child_element) = child {
            replace_font_attributes(child_element, has_myriad);
        }
    }
}
