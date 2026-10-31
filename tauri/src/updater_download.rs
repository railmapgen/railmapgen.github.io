// Standalone tests (no Tauri dependencies):
// rustc --edition=2021 --test tauri/src/updater_download.rs -o /tmp/updater-download-tests
// /tmp/updater-download-tests

const MIRROR_PREFIX: &str = "https://gh.monlor.com/";
const LEGACY_MIRROR_PREFIX: &str = "https://ghfast.top/";
const RELEASE_DOWNLOAD_PREFIX: &str =
    "https://github.com/railmapgen/railmapgen.github.io/releases/download/";

/// Prefer Monlor, then GitHub, for this repository's release assets.
/// Unknown URLs stay untouched; URL bytes are preserved rather than decoded.
pub fn download_urls(url: &str) -> Vec<String> {
    let github_url = url
        .strip_prefix(MIRROR_PREFIX)
        .or_else(|| url.strip_prefix(LEGACY_MIRROR_PREFIX))
        .unwrap_or(url);

    if !is_release_asset_url(github_url) {
        return vec![url.to_owned()];
    }

    vec![format!("{MIRROR_PREFIX}{github_url}"), github_url.to_owned()]
}

fn is_release_asset_url(url: &str) -> bool {
    if url
        .bytes()
        .any(|byte| byte.is_ascii_whitespace() || byte.is_ascii_control())
    {
        return false;
    }
    let Some(release_path) = url.strip_prefix(RELEASE_DOWNLOAD_PREFIX) else {
        return false;
    };
    let path = release_path.split(['?', '#']).next().unwrap_or_default();
    let Some((tag, asset)) = path.split_once('/') else {
        return false;
    };

    is_path_segment(tag) && is_path_segment(asset)
}

fn is_path_segment(segment: &str) -> bool {
    if segment.is_empty() || segment.contains(['/', '\\']) {
        return false;
    }
    // Encoded dots are also normalized as path traversal by URL parsers.
    let dots = segment.to_ascii_lowercase().replace("%2e", ".");
    dots != "." && dots != ".."
}

#[cfg(test)]
mod tests {
    use super::download_urls;

    const GITHUB: &str = "https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-20261031/Rail.Map.Toolkit_aarch64.app.tar.gz";
    const MONLOR: &str = "https://gh.monlor.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-20261031/Rail.Map.Toolkit_aarch64.app.tar.gz";

    #[test]
    fn github_asset_prefers_monlor_then_direct() {
        assert_eq!(download_urls(GITHUB), vec![MONLOR, GITHUB]);
    }

    #[test]
    fn monlor_asset_has_one_direct_fallback_without_duplicates() {
        assert_eq!(download_urls(MONLOR), vec![MONLOR, GITHUB]);
    }

    #[test]
    fn legacy_ghfast_asset_migrates_to_monlor_then_direct() {
        let legacy = format!("https://ghfast.top/{GITHUB}");
        assert_eq!(download_urls(&legacy), vec![MONLOR, GITHUB]);
    }

    #[test]
    fn encoded_path_and_query_bytes_are_preserved() {
        let github = "https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri%2F20261031/Rail%20Map%2BToolkit.app.tar.gz?download=1&name=%2f%2F#section";
        let mirror = format!("https://gh.monlor.com/{github}");
        assert_eq!(download_urls(github), vec![mirror.clone(), github.to_owned()]);
        assert_eq!(download_urls(&mirror), vec![mirror.clone(), github.to_owned()]);
    }

    #[test]
    fn unknown_hosts_are_not_rewritten() {
        for url in [
            "https://example.com/update.tar.gz",
            "https://github.com.evil/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "https://gh.monlor.com.evil/https://github.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "https://github.com@evil.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
        ] {
            assert_eq!(download_urls(url), vec![url]);
        }
    }

    #[test]
    fn other_repositories_and_repository_prefix_spoofs_are_not_rewritten() {
        for url in [
            "https://github.com/other/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "https://github.com/railmapgen/railmapgen.github.io.evil/releases/download/tag/app.tar.gz",
            "https://gh.monlor.com/https://github.com/other/repo/releases/download/tag/app.tar.gz",
            "https://ghfast.top/https://github.com/other/repo/releases/download/tag/app.tar.gz",
        ] {
            assert_eq!(download_urls(url), vec![url]);
        }
    }

    #[test]
    fn non_https_urls_and_nested_mirrors_are_not_rewritten() {
        for url in [
            "http://github.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "https://gh.monlor.com/http://github.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "http://gh.monlor.com/https://github.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
            "https://gh.monlor.com/https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/download/tag/app.tar.gz",
        ] {
            assert_eq!(download_urls(url), vec![url]);
        }
    }

    #[test]
    fn incomplete_release_paths_are_not_rewritten() {
        let prefix = "https://github.com/railmapgen/railmapgen.github.io/releases/download/";
        for suffix in [
            "",
            "tag",
            "tag/",
            "/app.tar.gz",
            "tag/?asset=app.tar.gz",
            "tag/app/extra.tar.gz",
        ] {
            let url = format!("{prefix}{suffix}");
            assert_eq!(download_urls(&url), vec![url.clone()]);
        }
    }

    #[test]
    fn traversal_and_unescaped_whitespace_are_not_rewritten() {
        let prefix = "https://github.com/railmapgen/railmapgen.github.io/releases/download/";
        for suffix in [
            "../app.tar.gz",
            "%2e%2E/app.tar.gz",
            "tag/.",
            "tag/%2e.",
            "tag\\other/app.tar.gz",
            "tag/app name.tar.gz",
            "tag/app.tar.gz\n",
        ] {
            let url = format!("{prefix}{suffix}");
            assert_eq!(download_urls(&url), vec![url.clone()]);
        }
    }
}
