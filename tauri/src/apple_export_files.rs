//! Temporary files owned by Apple export sessions.
//!
//! This module deliberately has no Tauri dependency so file lifetimes and
//! byte-preserving uploads can be checked without a running native window.

use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

pub const MAX_CHUNK_SIZE: usize = 1024 * 1024;
const DIRECTORY_PREFIX: &str = "rmt-export-";
static NEXT_ID: AtomicU64 = AtomicU64::new(0);

fn unique_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!(
        "{DIRECTORY_PREFIX}{}-{timestamp:x}-{}",
        std::process::id(),
        NEXT_ID.fetch_add(1, Ordering::Relaxed)
    )
}

fn session_owner(name: &str) -> Option<u32> {
    let mut parts = name.strip_prefix(DIRECTORY_PREFIX)?.split('-');
    let process = parts.next()?;
    let timestamp = parts.next()?;
    let serial = parts.next()?;
    if parts.next().is_some()
        || process.is_empty()
        || !process.bytes().all(|byte| byte.is_ascii_digit())
        || timestamp.is_empty()
        || !timestamp.bytes().all(|byte| byte.is_ascii_hexdigit())
        || serial.is_empty()
        || !serial.bytes().all(|byte| byte.is_ascii_digit())
    {
        return None;
    }
    let process: u32 = process.parse().ok()?;
    if process == 0 || process > i32::MAX as u32 {
        return None;
    }
    u128::from_str_radix(timestamp, 16).ok()?;
    serial.parse::<u64>().ok()?;
    Some(process)
}

#[cfg(unix)]
fn process_is_alive(process: u32) -> bool {
    extern "C" {
        fn kill(process: i32, signal: i32) -> i32;
    }
    // Signal zero only probes existence; it never sends a signal. EPERM means
    // the process exists but belongs to a user we cannot signal.
    if unsafe { kill(process as i32, 0) } == 0 {
        return true;
    }
    std::io::Error::last_os_error().kind() == std::io::ErrorKind::PermissionDenied
}

#[cfg(not(unix))]
fn process_is_alive(_process: u32) -> bool {
    // This module is used on Apple platforms. Preserve a valid session if a
    // non-Unix test host cannot safely determine whether its owner is alive.
    true
}

fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.trim().is_empty()
        || matches!(filename, "." | "..")
        || filename.contains(['/', '\\'])
        || filename.chars().any(char::is_control)
    {
        return Err("Export filename must be a nonempty filename without path separators or control characters".into());
    }
    Ok(())
}

/// A complete file that must remain alive until native sharing or saving ends.
/// Dropping it removes only its own generated session directory.
#[derive(Debug)]
pub struct ExportFile {
    pub path: PathBuf,
    // macOS uses the original name in its save panel; iOS reads it from the URL.
    #[cfg_attr(target_os = "ios", allow(dead_code))]
    pub filename: String,
    // iOS uses MIME information for image activities; macOS copies the file.
    #[cfg_attr(target_os = "macos", allow(dead_code))]
    pub mime_type: String,
    directory: PathBuf,
}

impl Drop for ExportFile {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.directory);
    }
}

// Field order closes the file before removing its directory on abort or error.
struct Upload {
    file: File,
    item: ExportFile,
}

/// The caller supplies an application-owned export directory, never a user
/// destination. Startup reclaims generated directories whose owner is no longer
/// alive, so another running copy of this application can finish its export.
pub struct ExportFiles {
    root: PathBuf,
    uploads: HashMap<String, Upload>,
}

impl ExportFiles {
    pub fn new(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&root)
            .map_err(|error| format!("Cannot create export directory: {error}"))?;
        for entry in fs::read_dir(&root)
            .map_err(|error| format!("Cannot inspect export directory: {error}"))?
        {
            let entry = entry.map_err(|error| format!("Cannot inspect export session: {error}"))?;
            if !entry
                .file_name()
                .to_string_lossy()
                .starts_with(DIRECTORY_PREFIX)
            {
                continue;
            }
            let kind = entry
                .file_type()
                .map_err(|error| format!("Cannot inspect export session: {error}"))?;
            if kind.is_dir()
                && session_owner(&entry.file_name().to_string_lossy())
                    .map(process_is_alive)
                    .unwrap_or(false)
            {
                continue;
            }
            // Never follow a symlink while reclaiming an interrupted export.
            let result = if kind.is_symlink() {
                fs::remove_file(entry.path())
            } else if kind.is_dir() {
                fs::remove_dir_all(entry.path())
            } else {
                continue;
            };
            result.map_err(|error| format!("Cannot remove interrupted export: {error}"))?;
        }
        Ok(Self {
            root,
            uploads: HashMap::new(),
        })
    }

    pub fn begin(&mut self, filename: &str, mime_type: &str) -> Result<String, String> {
        validate_filename(filename)?;
        let (id, directory) = loop {
            let id = unique_id();
            let directory = self.root.join(&id);
            match fs::create_dir(&directory) {
                Ok(()) => break (id, directory),
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => return Err(format!("Cannot create export session: {error}")),
            }
        };
        let item = ExportFile {
            path: directory.join(filename),
            filename: filename.into(),
            mime_type: mime_type.into(),
            directory,
        };
        // `item` cleans up the directory if opening the file fails.
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&item.path)
            .map_err(|error| format!("Cannot create export file: {error}"))?;
        self.uploads.insert(id.clone(), Upload { file, item });
        Ok(id)
    }

    pub fn append(&mut self, id: &str, bytes: &[u8]) -> Result<(), String> {
        let upload = self
            .uploads
            .get_mut(id)
            .ok_or_else(|| "Unknown or completed export session".to_string())?;
        let result = if bytes.len() > MAX_CHUNK_SIZE {
            Err(format!(
                "Export chunks must not exceed {MAX_CHUNK_SIZE} bytes"
            ))
        } else {
            upload
                .file
                .write_all(bytes)
                .map_err(|error| format!("Cannot write export file: {error}"))
        };
        if result.is_err() {
            // A partial or invalid upload must never become a shareable file.
            self.uploads.remove(id);
        }
        result
    }

    pub fn finish(&mut self, id: &str) -> Result<ExportFile, String> {
        let Upload { mut file, item } = self
            .uploads
            .remove(id)
            .ok_or_else(|| "Unknown or completed export session".to_string())?;
        file.flush()
            .and_then(|()| file.sync_all())
            .map_err(|error| format!("Cannot finish export file: {error}"))?;
        drop(file);
        Ok(item)
    }

    pub fn abort(&mut self, id: &str) -> Result<(), String> {
        self.uploads
            .remove(id)
            .map(drop)
            .ok_or_else(|| "Unknown or completed export session".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    struct TestDirectory(PathBuf);

    impl TestDirectory {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!("rmt-files-test-{}", unique_id()));
            fs::create_dir(&path).unwrap();
            Self(path)
        }

        fn exports(&self) -> PathBuf {
            self.0.join("exports")
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn entry_count(path: &Path) -> usize {
        fs::read_dir(path).unwrap().count()
    }

    #[test]
    fn chunks_preserve_binary_contents_names_and_mime() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        let name = "线路 图 01.png";
        let id = sessions.begin(name, "image/png").unwrap();
        let first = vec![0x89; MAX_CHUNK_SIZE];
        let last = [0, 1, 0xff, 10];
        sessions.append(&id, &first).unwrap();
        sessions.append(&id, &last).unwrap();
        let item = sessions.finish(&id).unwrap();
        assert_eq!(item.filename, name);
        assert_eq!(item.mime_type, "image/png");
        assert_eq!(item.path.file_name().unwrap(), name);
        let mut expected = first;
        expected.extend_from_slice(&last);
        assert_eq!(fs::read(&item.path).unwrap(), expected);
        // Removing the upload manager cannot remove a file owned by a presenter.
        drop(sessions);
        assert!(item.path.is_file());
        drop(item);
        assert_eq!(entry_count(&directory.exports()), 0);
    }

    #[test]
    fn same_filenames_have_independent_sessions() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        let first = sessions.begin("map.json", "application/json").unwrap();
        let second = sessions.begin("map.json", "application/json").unwrap();
        assert_ne!(first, second);
        sessions.append(&second, b"second").unwrap();
        sessions.append(&first, b"first").unwrap();
        let second = sessions.finish(&second).unwrap();
        let first = sessions.finish(&first).unwrap();
        assert_ne!(first.path, second.path);
        assert_eq!(fs::read(&first.path).unwrap(), b"first");
        assert_eq!(fs::read(&second.path).unwrap(), b"second");
        drop(first);
        assert!(second.path.is_file());
    }

    #[test]
    fn empty_files_are_valid_exports() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        let id = sessions.begin("empty.txt", "text/plain").unwrap();
        sessions.append(&id, b"").unwrap();
        let item = sessions.finish(&id).unwrap();
        assert_eq!(fs::metadata(&item.path).unwrap().len(), 0);
    }

    #[test]
    fn unknown_and_finished_session_ids_are_rejected() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        assert!(sessions.append("../outside", b"x").is_err());
        assert!(sessions.finish("unknown").is_err());
        assert!(sessions.abort("unknown").is_err());
        let id = sessions.begin("map.svg", "image/svg+xml").unwrap();
        let _item = sessions.finish(&id).unwrap();
        assert!(sessions.finish(&id).is_err());
        assert!(sessions.append(&id, b"late").is_err());
    }

    #[test]
    fn unsafe_filenames_are_rejected_without_creating_files() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        for filename in [
            "",
            " ",
            ".",
            "..",
            "../map.json",
            "/map.json",
            "folder/map.json",
            "folder\\map.json",
            "map\0.png",
            "map\n.png",
            "map\u{7f}.png",
        ] {
            assert!(sessions.begin(filename, "").is_err(), "{filename:?}");
        }
        assert_eq!(entry_count(&directory.exports()), 0);
    }

    #[test]
    fn oversized_chunk_aborts_only_its_session() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        let broken = sessions.begin("broken.mp4", "video/mp4").unwrap();
        let healthy = sessions.begin("healthy.json", "application/json").unwrap();
        sessions.append(&broken, b"partial").unwrap();
        assert!(sessions
            .append(&broken, &vec![0; MAX_CHUNK_SIZE + 1])
            .is_err());
        assert!(sessions.finish(&broken).is_err());
        assert!(!directory.exports().join(broken).exists());
        sessions.append(&healthy, b"{}").unwrap();
        let healthy = sessions.finish(&healthy).unwrap();
        assert_eq!(fs::read(&healthy.path).unwrap(), b"{}");
    }

    #[test]
    fn abort_and_manager_drop_remove_unfinished_uploads() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        let cancelled = sessions.begin("cancelled.txt", "text/plain").unwrap();
        let abandoned = sessions.begin("abandoned.txt", "text/plain").unwrap();
        sessions.abort(&cancelled).unwrap();
        assert!(!directory.exports().join(cancelled).exists());
        assert!(directory.exports().join(&abandoned).exists());
        drop(sessions);
        assert!(!directory.exports().join(abandoned).exists());
        assert_eq!(entry_count(&directory.exports()), 0);
    }

    #[test]
    fn another_manager_preserves_an_active_upload_in_the_shared_root() {
        let directory = TestDirectory::new();
        let mut first = ExportFiles::new(directory.exports()).unwrap();
        let id = first.begin("map.json", "application/json").unwrap();
        first.append(&id, b"{\"name\":").unwrap();
        let mut second = ExportFiles::new(directory.exports()).unwrap();
        let second_id = second.begin("map.json", "application/json").unwrap();
        first.append(&id, b"\"map\"}").unwrap();
        let item = first.finish(&id).unwrap();
        assert_eq!(fs::read(&item.path).unwrap(), b"{\"name\":\"map\"}");
        drop(second);
        assert!(!directory.exports().join(second_id).exists());
        assert!(item.path.is_file());
    }

    #[test]
    fn another_manager_preserves_a_file_still_owned_by_a_presenter() {
        let directory = TestDirectory::new();
        let mut first = ExportFiles::new(directory.exports()).unwrap();
        let id = first.begin("map.png", "image/png").unwrap();
        first.append(&id, b"png bytes").unwrap();
        let item = first.finish(&id).unwrap();
        drop(first);
        let second = ExportFiles::new(directory.exports()).unwrap();
        assert_eq!(fs::read(&item.path).unwrap(), b"png bytes");
        drop(second);
        assert!(item.path.is_file());
        drop(item);
        assert_eq!(entry_count(&directory.exports()), 0);
    }

    #[cfg(unix)]
    #[test]
    fn startup_reclaims_a_valid_session_after_its_owner_exits() {
        use std::process::{Command, Stdio};
        let directory = TestDirectory::new();
        let mut child = Command::new(std::env::current_exe().unwrap())
            .arg("--list")
            .stdout(Stdio::null())
            .spawn()
            .unwrap();
        let owner = child.id();
        assert!(child.wait().unwrap().success());
        let root = directory.exports();
        let stale = root.join(format!("{DIRECTORY_PREFIX}{owner}-1234-0"));
        fs::create_dir_all(&stale).unwrap();
        fs::write(stale.join("unfinished.json"), b"partial").unwrap();
        let _sessions = ExportFiles::new(root).unwrap();
        assert!(!stale.exists());
    }

    #[test]
    fn session_owner_requires_the_generated_positive_pid_format() {
        assert_eq!(session_owner(&unique_id()), Some(std::process::id()));
        for name in [
            "rmt-export-old",
            "rmt-export-0-1234-0",
            "rmt-export--1-1234-0",
            "rmt-export-+1-1234-0",
            "rmt-export-2147483648-1234-0",
            "rmt-export-1-nothex-0",
            "rmt-export-1-1234-+1",
            "rmt-export-1-1234-0-extra",
        ] {
            assert_eq!(session_owner(name), None, "{name}");
        }
    }

    #[test]
    fn startup_reclaims_only_generated_sessions_inside_its_root() {
        let directory = TestDirectory::new();
        let root = directory.exports();
        let stale = root.join(format!("{DIRECTORY_PREFIX}old"));
        fs::create_dir_all(&stale).unwrap();
        fs::write(stale.join("unfinished.mp4"), b"partial").unwrap();
        fs::create_dir(root.join("unrelated")).unwrap();
        fs::write(root.join("notes.txt"), b"keep").unwrap();
        let outside = directory.0.join("outside.txt");
        fs::write(&outside, b"keep outside").unwrap();
        let _sessions = ExportFiles::new(root.clone()).unwrap();
        assert!(!stale.exists());
        assert!(root.join("unrelated").is_dir());
        assert_eq!(fs::read(root.join("notes.txt")).unwrap(), b"keep");
        assert_eq!(fs::read(&outside).unwrap(), b"keep outside");
    }

    #[cfg(unix)]
    #[test]
    fn startup_does_not_follow_stale_session_symlinks() {
        use std::os::unix::fs::symlink;
        let directory = TestDirectory::new();
        let root = directory.exports();
        fs::create_dir(&root).unwrap();
        let outside = directory.0.join("outside");
        fs::create_dir(&outside).unwrap();
        fs::write(outside.join("keep.txt"), b"keep").unwrap();
        let link = root.join(format!("{DIRECTORY_PREFIX}symlink"));
        symlink(&outside, &link).unwrap();
        let _sessions = ExportFiles::new(root).unwrap();
        assert!(!link.exists());
        assert_eq!(fs::read(outside.join("keep.txt")).unwrap(), b"keep");
    }

    #[test]
    fn failed_file_creation_cleans_up_its_session() {
        let directory = TestDirectory::new();
        let mut sessions = ExportFiles::new(directory.exports()).unwrap();
        assert!(sessions.begin(&"x".repeat(1024), "text/plain").is_err());
        assert_eq!(entry_count(&directory.exports()), 0);
    }
}
