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

The iOS and macOS Xcode builds share `instance: "AppStore"` in the host and every bundled child application's `info.json`. Frontend environment checks use `rmgRuntime.getInstance()` to identify this platform; no separate operating-system or distribution fields are added. The separate desktop release workflow continues to write `instance: "Tauri"`.

| Platform      | Scheme                         | Destination                   |
| ------------- | ------------------------------ | ----------------------------- |
| iPhone / iPad | `railmapgen_iOS`               | Simulator or connected device |
| macOS Debug   | `RailMapToolkit-macOS-Debug`   | My Mac                        |
| macOS Release | `RailMapToolkit-macOS-Release` | My Mac                        |

Select a scheme and click Run. Builds include offline resources and do not require a running frontend server or Tauri CLI daemon. For physical iOS devices, select your signing Team in Signing & Capabilities; you may need to select it again after regeneration.

Re-run generation after moving the checkout or changing Node, Cargo, or Xcode. Generated projects and build products are ignored by Git; keep native build changes in `scripts/apple` or `tauri/src`.

iPhone Duo fills all four screen edges, ignoring physical safe-area and corner insets in every orientation and fold state. Keyboard avoidance still applies. Other iPhones keep their existing notch-edge exclusion, and iPad keeps its existing top exclusion. Regenerate the Xcode project after changing this native device detection.

iOS uses the separate `tauri/icons/icon-ios.png` master: an opaque RGB PNG with slightly more padding. Generation resizes it for every iPhone, iPad, and App Store icon slot without adding an alpha channel. Other platforms continue to use the shared icons. Regenerate the project after changing the iOS master.

### iOS version and build number

The iOS release version (`CFBundleShortVersionString`) comes from `package.json`. Choose a separate build number when generating the project; for package version `3.2.47`, this creates `3.2.47 (4)`:

```sh
npm run apple:generate -- --build-number 4
# The environment variable supplies the same value when no option is given:
RMT_APPLE_BUILD_NUMBER=4 npm run apple:generate
```

Priority is `--build-number`, then `RMT_APPLE_BUILD_NUMBER`, then the local default `1`. The number must contain one to three dot-separated integers, such as `4` or `84.1`. Generation records it as the iOS target's `CURRENT_PROJECT_VERSION`, and `CFBundleVersion` references that build setting. Subsequent Xcode builds retain the selected number. To change it without regenerating, edit `CURRENT_PROJECT_VERSION` in Xcode or pass `CURRENT_PROJECT_VERSION=5` to `xcodebuild`. Regeneration uses the option/environment/default again, so supply the desired number when regenerating. These settings apply to iOS; macOS packaging keeps its existing version behavior.

The iOS GitHub Actions workflow supplies `RMT_APPLE_BUILD_NUMBER` as `github.run_number.github.run_attempt`. For example, run 84 produces `84.1`, its first rerun produces `84.2`, and a new run produces `85.1`. Both channels use this sequence. The workflow verifies the release version and build number in the archive and exported unsigned IPA. It does not upload to App Store Connect. See [GitHub's variable reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables) for the counter behavior.

Before uploading a new build of the same version, ensure its build number is higher than the existing uploaded builds. When adopting or moving this workflow, compare its initial number against the app's upload history and choose a higher starting offset if needed. The run counter belongs to one workflow, so additional publishing workflows or local uploads need a coordinated numbering source. New run numbers do not guarantee upload order: if `85.1` has already uploaded, rerunning 84 as `84.2` still produces an older number. Start a new run for that code, and check the build number before uploading older artifacts. Local-only debugging may reuse a number. A TestFlight build selected directly for App Review keeps its existing number; generating a different binary needs a new number.

### Appearance and language on iPhone and iPad

The app's Appearance preference also appears in iOS Settings under Rail Map Toolkit. Changes in either place are saved to the same native preference and applied when the app becomes active. Existing in-app preferences migrate the first time the native settings bridge connects.

Appearance supports Light, Dark, and System. The exposed screen edges and native presentation backgrounds use the same appearance as the app. System follows the device appearance, including changes while the app is running.

Language supports English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and System. System follows the preferred language selected for this app in iOS Settings, falling back to the device's preferred supported language. iOS Settings uses the system's Preferred Language entry; the Settings bundle only supplies Appearance. Explicit in-app language choices remain saved in native preferences and do not rewrite the system's Preferred Language setting.

Regenerate the Xcode project after updating the native settings implementation so the Settings bundle and preference bridge are included. To validate on a simulator or device, change appearance both inside the app and in iOS Settings. Select System for the in-app language, change the system's Preferred Language entry in iOS Settings, and return to the app. Confirm there is only one language entry in iOS Settings, then check System mode, rotation, and iPad window resizing.

### Links on iPhone and iPad

External HTTP and HTTPS links open in the app using the native Safari browser window. This includes links and `window.open` calls from bundled child applications. Close the browser window to return to the current application. Internal application routes and file exports retain their existing behavior.

Regenerate the Xcode project after updating the browser integration to include the SafariServices framework. On a simulator or device, check an external link from both the host menu and a child application, close the browser, and confirm that the current project and file sharing still work.

### App Store subscriptions

The AppStore account subscription dialog retains the plan comparison and introduction from Toolkit 3.2.47. Only the acquisition section at the bottom is replaced with one button to open Apple's native `SubscriptionStoreView`; external payment links and the CDKey form are hidden. This purchase interface requires iOS 17+ or macOS 14+. Older systems receive an availability error when opening it. Website and other desktop distributions keep the full upstream guide and CDKey flow.

The current account server has not deployed IAP. The client treats an HTTP 404 from `/v1/iap/context` as unavailable: automatic recovery quietly skips it, and the purchase button reports that subscriptions are not yet available. Account login, token refresh and cloud synchronization continue to use the original server without requiring StoreKit authentication or IAP support.

The client integration expects `/v1/iap/context` to return an enabled flag, product IDs, subscription group ID and allowed transaction environments for the current account token. This capability check happens before any StoreKit transaction query. The App Store Connect app ID is `6832421802`, and its subscription group ID is `22559988`; configure these when implementing the IAP backend. The supplied integration catalogue lists `subscription_ultimate`, `subscription_cloud` and `subscription_export`, all annual subscriptions, with levels 1/2/2. Confirm these against App Store Connect before release, since the originally supplied remote configuration was 1/2/3. These are integration requirements, not an active catalogue on the current account server. Once deployed, purchase product identifiers and localized prices will come from the backend catalogue and StoreKit; the upstream guide remains informational. Client code cannot change Apple's subscription ranking.

Purchases and restored transactions are submitted as `{signedTransactionInfo}` to `/v1/iap/apple/transactions` using the account that opened the store. This request does not supply an environment, user ID, price or grant amount; no app account token registration is needed. StoreKit transactions are finished only after the server confirms the matching transaction environment, no pending claim, a terminal `DELIVERED` or `WITHHELD` result and `finishAllowed: true`. A refunded `WITHHELD` result refreshes account balances without announcing an entitlement grant. `bonusStatus: PENDING` does not delay completion of an otherwise delivered purchase. An account change aborts delivery; failed verification leaves the transaction unfinished. The host recovers unfinished purchases at launch, after login, when returning to the foreground and on StoreKit transaction updates. The native store also provides Restore Purchases.

Automatic recovery waits for the account token check before requesting `/v1/iap/context`. Returning to the foreground forces a token refresh even if the saved access token has not yet expired. A refresh already running for the same account session is shared with the periodic token check; recovery uses the resulting current token and stops if the account changes or logs out while waiting.

The verification request has a 90-second client timeout to accommodate the server's 30-second OCSP check and subsequent Apple/database work. HTTP 429 stops the current recovery batch, keeping the remaining transactions for a later retry. Temporary errors and unclaimed transactions are never finished. The server determines cumulative local subscription expiry and audio points; the client does not derive grants from Apple's accelerated Sandbox expiry, compute the 45-day renewal bonus or apply refunds locally. Refunds currently adjust the aggregate balance, which can include balances from CDKeys and other purchases, following the supplied backend rules.

The native bridge is compiled by Cargo from `scripts/apple/Subscriptions.swift` for Apple builds. Rebuild the native application after changing it. Validate purchases, cancellation, Ask to Buy, Restore Purchases, offline recovery and account conflicts using Sandbox/TestFlight against the same account server. Xcode local StoreKit transactions are intentionally rejected by server verification. Automated checks do not perform real purchases.

### Stable, TestFlight and App Review

Select the Apple channel when generating the Xcode project:

```sh
npm run apple:generate -- --channel stable
npm run apple:generate -- --channel TestFlight
```

The generated iOS and macOS projects expose the user-defined build setting `RMT_APPLE_CHANNEL`. Set it to `stable` or `testflight` in Xcode, or override it with `xcodebuild ... RMT_APPLE_CHANNEL=testflight`. Direct build commands also accept `node scripts/apple/apple.mjs build ios --channel TestFlight` (or `macos`). The selection is independent of Debug/Release. Priority is the explicit command option, Xcode/environment value, generated project selection, then `stable`. The GitHub Actions iOS build has the same channel choice for manual runs.

Apple controls the actual payment environment. [TestFlight purchases use Sandbox](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox), and [App Review also tests purchases in Sandbox](https://developer.apple.com/help/app-review/before-submitting-for-review/configure-in-app-purchases). Every channel uses the original API at `https://railmapgen.org/v1`, configured by `API_URL` in `src/util/constants.ts`. Login, token refresh, cloud saves and subscription verification share this address and the original account and synchronization storage keys. Bundled child applications use the same canonical API directly. There is no separate Sandbox server or request rerouting.

Account startup does not query StoreKit or require an App Store payment-environment hint. Native purchase and recovery paths verify App Store information and signed transactions when needed. A TestFlight build presented with verified Production StoreKit information is blocked before a purchase. The IAP context may allow `PRODUCTION`, `SANDBOX` or both; its allowed environments must include the verified StoreKit environment. The client narrows native authorization to that verified environment and refuses transactions or verification replies from a different environment.

The shared server must verify the signed transaction and determine whether delivery is allowed for its actual Apple environment. The client continues to submit only `{signedTransactionInfo}` and does not send a transaction-environment override. Provide App Review with an ordinary account on the shared server and validate Sandbox/TestFlight purchases there before release. Server deployment and environment support require backend configuration; this repository contains the client integration.

### StoreKit diagnostics during Xcode runs

`SKInternalErrorDomain` error 14 has no publicly documented one-to-one meaning. It must not be confused with code 14 in the separate public `SKErrorDomain`. The original account initialization queried `AppTransaction.shared` before allowing login; this API can throw when the app transaction is unavailable or App Store authentication is missing, including direct Xcode installations. Account initialization uses the shared API directly and does not depend on this API.

For actual IAP failures, the native bridge returns the error domain, code and up to four underlying errors without returning `userInfo`, receipts or JWS in diagnostics. The client retains those identities for debugging. Debug builds mark any development-only IAP routing hint explicitly; Release builds do not use that fallback. Purchases still need verified App Store information. `AppTransaction.refresh()` is limited to an explicit purchase/authentication refresh action; startup and automatic recovery never call it because it may present an authentication prompt. No transaction is fabricated or finished as a workaround for an error.

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
