Run the native WebView recovery tests on macOS with Xcode, XcodeGen, and an installed iOS Simulator runtime:

```sh
node scripts/apple/tests/run-recovery-tests.mjs
```

The runner builds a small, isolated UIKit test host. It creates a dedicated simulator and removes that simulator after the run. It does not build Cargo, load the bundled websites, or change the generated application project. Use `--build-only` to compile the test host and XCTest bundle without running a simulator. Failed runs retain their build log and result bundle in the printed temporary directory.

The deterministic tests exercise the production recovery coordinator using a controlled WKWebView subclass. They cover foreground and background termination, navigation and probe races, delegate forwarding, scene detach/reconnect, recovery throttling, and the native retry button.

Two integration tests serve a tiny local document through a `tauri` URL scheme handler in a fresh, nonpersistent WKWebView. They terminate only that WebView's renderer and verify recovery in the same native WebView, including working JavaScript after reloading. One exercises foreground recovery; the other verifies that recovery waits until the coordinator becomes active. These tests use a guarded private renderer-PID lookup because WebKit has no public API for injecting a renderer termination. The lookup exists only in the test target; it skips when the current WebKit cannot provide a safe PID. A simulator run does not replace testing actual device background suspension and memory pressure.
