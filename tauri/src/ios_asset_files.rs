use std::{
    borrow::Cow,
    fs,
    path::{Component, Path, PathBuf},
    sync::OnceLock,
};

type FileAssetsIter<'a> = dyn Iterator<Item = (Cow<'a, str>, Cow<'a, [u8]>)> + 'a;

/// Reads frontend files from a fixed bundle directory.
#[derive(Default)]
pub(crate) struct FileAssets {
    root: OnceLock<PathBuf>,
}

impl FileAssets {
    pub(crate) fn set_root(&self, root: PathBuf) -> Result<(), PathBuf> {
        self.root.set(root)
    }

    fn resolve(&self, key: &str) -> Option<PathBuf> {
        let root = self.root.get()?;
        let relative = Path::new(key.strip_prefix('/')?);
        if relative.as_os_str().is_empty()
            || !relative
                .components()
                .all(|component| matches!(component, Component::Normal(_)))
        {
            return None;
        }

        let path = root.join(relative).canonicalize().ok()?;
        (path.starts_with(root) && path.is_file()).then_some(path)
    }

    pub(crate) fn get(&self, key: &str) -> Option<Cow<'_, [u8]>> {
        fs::read(self.resolve(key)?).ok().map(Cow::Owned)
    }

    pub(crate) fn iter(&self) -> Box<FileAssetsIter<'_>> {
        let Some(root) = self.root.get() else {
            return Box::new(std::iter::empty());
        };

        let mut directories = vec![root.clone()];
        let mut keys = Vec::new();
        while let Some(directory) = directories.pop() {
            let Ok(entries) = fs::read_dir(directory) else {
                continue;
            };
            for entry in entries.flatten() {
                let Ok(file_type) = entry.file_type() else {
                    continue;
                };
                let path = entry.path();
                if file_type.is_dir() {
                    directories.push(path);
                } else if file_type.is_file() || file_type.is_symlink() {
                    // Do not follow directory symlinks; file symlinks are checked
                    // against the resource root by resolve() before reading.
                    if let Some(relative) = path.strip_prefix(root).ok().and_then(Path::to_str) {
                        keys.push(format!("/{relative}"));
                    }
                }
            }
        }
        keys.sort();

        // Collect only names above. Read each body when the consumer requests it.
        Box::new(keys.into_iter().filter_map(move |key| {
            let bytes = self.get(&key)?;
            Some((Cow::Owned(key), bytes))
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_DIRECTORY: AtomicU64 = AtomicU64::new(0);

    struct Fixture(PathBuf);

    impl Fixture {
        fn new() -> Self {
            let id = NEXT_DIRECTORY.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!(
                "railmapgen-ios-assets-{}-{}-{id}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            fs::create_dir_all(path.join("ui/nested")).unwrap();
            Self(path)
        }

        fn assets(&self) -> FileAssets {
            let assets = FileAssets::default();
            assets
                .set_root(self.0.join("ui").canonicalize().unwrap())
                .unwrap();
            assets
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn reads_nested_utf8_names_and_rejects_missing_files_or_directories() {
        let fixture = Fixture::new();
        fs::write(fixture.0.join("ui/nested/线路 map.txt"), "轨道地图").unwrap();
        let assets = fixture.assets();

        assert_eq!(
            assets.get("/nested/线路 map.txt").unwrap().as_ref(),
            "轨道地图".as_bytes()
        );
        assert!(assets.get("/missing.txt").is_none());
        assert!(assets.get("/nested").is_none());
        assert!(assets.get("/").is_none());
    }

    #[test]
    fn rejects_parent_paths_and_symlinks_outside_the_bundle_root() {
        let fixture = Fixture::new();
        fs::write(fixture.0.join("outside.txt"), "outside").unwrap();
        let assets = fixture.assets();

        assert!(assets.get("/../outside.txt").is_none());
        assert!(assets.get("/nested/../../outside.txt").is_none());

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(
                fixture.0.join("outside.txt"),
                fixture.0.join("ui/linked.txt"),
            )
            .unwrap();
            assert!(assets.get("/linked.txt").is_none());
        }
    }

    #[test]
    fn enumerates_nested_files_and_reads_bodies_lazily() {
        let fixture = Fixture::new();
        let index = fixture.0.join("ui/index.html");
        fs::write(&index, "before").unwrap();
        fs::write(fixture.0.join("ui/nested/data.json"), "{}").unwrap();
        let assets = fixture.assets();
        let iterator = assets.iter();

        fs::write(&index, "after").unwrap();
        let entries: Vec<_> = iterator.collect();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].0, "/index.html");
        assert_eq!(entries[0].1.as_ref(), b"after");
        assert_eq!(entries[1].0, "/nested/data.json");
        assert_eq!(entries[1].1.as_ref(), b"{}");
    }
}
