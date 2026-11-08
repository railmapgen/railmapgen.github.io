# Apple development

Build the Tauri application for iPhone/iPad (iOS 15+) and native macOS from one generated Xcode workspace.

## Setup

Use macOS with full Xcode, an installed iOS simulator runtime, Node.js 22.14+, npm, and Rust via rustup. Open Xcode once to finish setup.

```sh
brew install xcodegen
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
npm ci
```

If multiple Xcode versions are installed, select the intended one with `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`.

## Generate and run

From the repository root:

```sh
npm run apple:generate
npm run apple:open
```

This builds the local frontend, caches the eight published child applications, and creates `tauri/gen/xcode/RailMapToolkit.xcworkspace`. Open the workspace belonging to the checkout you want to build.

| Platform      | Scheme                         | Destination                   |
| ------------- | ------------------------------ | ----------------------------- |
| iPhone / iPad | `railmapgen_iOS`               | Simulator or connected device |
| macOS Debug   | `RailMapToolkit-macOS-Debug`   | My Mac                        |
| macOS Release | `RailMapToolkit-macOS-Release` | My Mac                        |

Select a scheme and click Run. Builds include offline resources and do not require a running frontend server or Tauri CLI daemon. For physical iOS devices, select your signing Team in Signing & Capabilities; you may need to select it again after regeneration.

Re-run generation after moving the checkout or changing Node, Cargo, or Xcode. Generated projects and build products are ignored by Git; keep native build changes in `scripts/apple` or `tauri/src`.

### Appearance and language on iPhone and iPad

The app's Appearance and Language preferences also appear in iOS Settings under Rail Map Toolkit. Changes in either place are saved to the same native preferences and applied when the app becomes active. Existing in-app preferences migrate the first time the native settings bridge connects.

Appearance supports Light, Dark, and System. The exposed screen edges and native presentation backgrounds use the same appearance as the app. System follows the device appearance, including changes while the app is running.

Language supports English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and System. System follows the preferred language selected for this app in iOS Settings, falling back to the device's preferred supported language. Explicit in-app language choices synchronize with the Language preference supplied by the Settings bundle; they do not rewrite the system's Preferred Language setting.

Regenerate the Xcode project after updating the native settings implementation so the Settings bundle and preference bridge are included. To validate on a simulator or device, change appearance and language both inside the app and in iOS Settings, return to the app, then check System mode, rotation, and iPad window resizing.

### Links on iPhone and iPad

External HTTP and HTTPS links open in the app using the native Safari browser window. This includes links and `window.open` calls from bundled child applications. Close the browser window to return to the current application. Internal application routes and file exports retain their existing behavior.

Regenerate the Xcode project after updating the browser integration to include the SafariServices framework. On a simulator or device, check an external link from both the host menu and a child application, close the browser, and confirm that the current project and file sharing still work.

### WebView recovery on iPhone and iPad

The native host monitors termination of the main WebView's content process. If termination occurs in the background, recovery waits until the scene becomes active. The host reloads the existing WebView and preserves Tauri's navigation delegate, bridge, and website data. Ordinary foreground transitions probe the content process without reloading the page. A slow or unanswered probe alone does not trigger an automatic reload.

Automatic recovery is limited to one attempt per 60 seconds. Repeated termination or an unsuccessful recovery displays a native Reload button. Native recovery controls follow the app's language and appearance. This handles native process/lifecycle failures; a successful navigation does not establish that a child application's UI is healthy, and recovery cannot restore edits that were never persisted by that application.

Regenerate the Xcode project after changing `SceneDelegate.mm` or `WebViewRecovery.h/.mm`. Run the isolated UIKit/WebKit tests with an installed iOS simulator runtime:

```sh
npm run apple:test:recovery
# Compile the native test host without running a simulator:
npm run apple:test:recovery -- --build-only
```

The runner creates a temporary test project and a dedicated simulator, then deletes that simulator when finished. Failed runs retain their logs and result bundle at the printed temporary path. Native diagnostic messages use the `[RMTWebViewRecovery]` prefix. On a device, also check long background sessions, phone rotation, iPad window resizing, and file sharing after recovery.

## Resources and packaging

Normal builds rebuild the local host and reuse cached child applications. To refresh published children:

```sh
npm run apple:generate -- --refresh-assets
```

The standard Tauri desktop workflow is also available:

```sh
npm run tauri -- dev
npm run tauri -- build --bundles app
```

The iOS CI produces an unsigned device IPA. It must be signed through an appropriate distribution workflow before installation on an iPhone or iPad.

### Test a local RMP build

Build the desired RMP checkout with its normal `npm run build` command. Copy its `info.json` into the built `dist/` directory if the build does not emit it; its `component` must be `rmp` and `version` must identify the test build. The directory must contain the complete built application, including `index.html`, assets, and fonts.

Create the ignored, checkout-local file `tauri/.build/apple-local-resources.json`:

```json
{
    "rmp": {
        "directory": "/absolute/path/to/rmp/dist",
        "commit": "0123456789abcdef0123456789abcdef01234567",
        "dirty": false
    }
}
```

Only `directory` is required; `commit` and `dirty` are optional metadata describing the source used for that build. Run `npm run apple:generate` or build the existing Xcode workspace. Each native build uses this local RMP bundle in place of the published RMP cache, including offline builds and generation with `--refresh-assets`. The other seven child applications retain their normal published-resource behavior. The packaged source manifest marks RMP as local and records its content SHA-256 without including the local path. Native safe-area adaptation is applied to a copy, leaving the source build untouched.

To restore published RMP, delete `tauri/.build/apple-local-resources.json` and regenerate or rebuild. The local override does not change the published-resource cache or the live website. RMP source changes require rebuilding its `dist/` before the next native build.

## Checks and troubleshooting

```sh
npm run apple:test
npm run lint
npm test
npm run build
```

For native export-file and text-rendering regression tests:

```sh
rustc --edition 2021 --test tauri/src/apple_export_files.rs -o /tmp/rmt-export-file-tests
/tmp/rmt-export-file-tests
(cd tauri && TAURI_CONFIG='{"build":{"frontendDist":[]},"bundle":{"resources":[]}}' cargo test --locked --lib resvg::tests)
```

- Missing workspace or tools: check prerequisites, then run `apple:generate` again. Install missing simulator runtimes in Xcode Settings.
- Missing or incompatible cached applications: regenerate with `--refresh-assets`; the error identifies the application.
- Resource lock timeout: let the build identified by the reported owner PID finish, then retry. Stale locks are reclaimed automatically.
- Xcode 27+: generation configures scene lifecycle and SwiftPM compatibility automatically; regenerate after changing Xcode.
- Node 26 test failures: use `NODE_OPTIONS=--no-experimental-webstorage npm test`.
- Missing glyphs with System fonts only: disable that option to use bundled fonts.

After native layout or export changes, check phone rotation, iPad window resizing, keyboard avoidance, file sharing, and PNG text rendering on a simulator or device.
