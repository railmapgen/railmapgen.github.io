#import <WebKit/WebKit.h>

NS_ASSUME_NONNULL_BEGIN

// Main-thread-only lifecycle adapter for the existing Tauri WKWebView. The
// WebView retains the adapter; the adapter forwards Wry's navigation delegate.
@interface RMTWebViewRecovery : NSObject <WKNavigationDelegate>
@property(nonatomic, copy, nullable) void (^didRecover)(void);
+ (instancetype)registerWebView:(WKWebView *)webView;
- (void)setActive:(BOOL)active;
// A scene can disconnect while Tao retains the WebView. Keep observing native
// callbacks until it reconnects; disconnect is reserved for final teardown.
- (void)detach;
- (void)disconnect;
@end

NS_ASSUME_NONNULL_END
