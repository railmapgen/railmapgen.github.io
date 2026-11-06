use std::borrow::Cow;

use tauri::{
    utils::assets::{AssetKey, AssetsIter, CspHash},
    App, Assets, Manager, Runtime,
};

#[path = "ios_asset_files.rs"]
mod files;

/// Serves Apple offline applications from bundle resources without embedding them in Rust.
#[derive(Default)]
pub struct BundleAssets {
    files: files::FileAssets,
}

impl<R: Runtime> Assets<R> for BundleAssets {
    fn setup(&self, app: &App<R>) {
        let root = app
            .path()
            .resource_dir()
            .expect("failed to locate Apple bundle resources")
            .join("ui")
            .canonicalize()
            .expect("Apple frontend resources are missing from the bundle ui directory");
        assert!(
            root.is_dir(),
            "Apple frontend resource root is not a directory"
        );
        self.files
            .set_root(root)
            .expect("Apple frontend resources were already initialized");
    }

    fn get(&self, key: &AssetKey) -> Option<Cow<'_, [u8]>> {
        self.files.get(key.as_ref())
    }

    fn iter(&self) -> Box<AssetsIter<'_>> {
        self.files.iter()
    }

    fn csp_hashes(&self, _html_path: &AssetKey) -> Box<dyn Iterator<Item = CspHash<'_>> + '_> {
        // The iOS configuration currently has csp: null. If CSP is enabled,
        // provide hashes for the disk HTML's inline scripts and styles here.
        Box::new(std::iter::empty())
    }
}
