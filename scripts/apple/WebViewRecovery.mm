#import "WebViewRecovery.h"
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

static char rmtRecoveryKey;
static const NSTimeInterval RMTRecoveryInterval = 60;
static const NSTimeInterval RMTProbeTimeout = 3;
static const NSTimeInterval RMTNavigationTimeout = 15;

static BOOL RMTIsRecoveryURL(NSURL *url) {
    if (!url || url.user || url.password) return NO;
    return ([url.scheme isEqualToString:@"tauri"] && [url.host isEqualToString:@"localhost"]) ||
        (([url.scheme isEqualToString:@"http"] || [url.scheme isEqualToString:@"https"]) &&
            [url.host isEqualToString:@"tauri.localhost"]);
}

static BOOL RMTIsTerminatedError(NSError *error) {
    return [error.domain isEqualToString:WKErrorDomain] && error.code == WKErrorWebContentProcessTerminated;
}

// These controls remain usable even when no web content process is running.
static NSString *RMTRecoveryText(NSUInteger index) {
    NSString *language = [NSUserDefaults.standardUserDefaults stringForKey:@"rmtLanguage"];
    if (!language || [language isEqualToString:@"system"])
        language = NSBundle.mainBundle.preferredLocalizations.firstObject;
    NSDictionary<NSString *, NSArray<NSString *> *> *strings = @{
        @"en": @[@"Restoring page…", @"The page is not responding.", @"Reload"],
        @"zh-Hans": @[@"正在恢复页面…", @"页面暂时没有响应。", @"重新加载"],
        @"zh-Hant": @[@"正在恢復頁面…", @"頁面暫時沒有回應。", @"重新載入"],
        @"ja": @[@"ページを復元しています…", @"ページが応答していません。", @"再読み込み"],
        @"ko": @[@"페이지 복원 중…", @"페이지가 응답하지 않습니다.", @"새로고침"],
    };
    return (strings[language] ?: strings[@"en"])[index];
}

@interface RMTWebViewRecovery ()
@property(nonatomic, weak) WKWebView *webView;
@property(nonatomic, weak) id<WKNavigationDelegate> originalDelegate;
@property(nonatomic) BOOL connected;
@property(nonatomic) BOOL active;
@property(nonatomic) BOOL needsRecovery;
@property(nonatomic) BOOL recovering;
@property(nonatomic) BOOL hasAttemptedRecovery;
@property(nonatomic) NSTimeInterval lastAutomaticRecovery;
@property(nonatomic) NSUInteger generation;
@property(nonatomic, strong) NSURL *entryURL;
@property(nonatomic, strong) NSURL *lastGoodURL;
@property(nonatomic, strong) WKNavigation *currentNavigation;
@property(nonatomic, strong) WKNavigation *recoveryNavigation;
@property(nonatomic, strong) UIView *overlay;
@property(nonatomic, strong) UIActivityIndicatorView *spinner;
@property(nonatomic, strong) UILabel *statusLabel;
@property(nonatomic, strong) UIButton *retryButton;
- (void)probeAttempt:(NSUInteger)attempt;
- (void)beginRecovery:(BOOL)manual;
- (void)contentProcessTerminated;
- (void)watchRecovery;
@end

@implementation RMTWebViewRecovery
+ (instancetype)registerWebView:(WKWebView *)webView {
    NSAssert(NSThread.isMainThread, @"WebView recovery must run on the main thread");
    RMTWebViewRecovery *recovery = objc_getAssociatedObject(webView, &rmtRecoveryKey);
    if (!recovery) {
        recovery = [[self alloc] init];
        recovery.webView = webView;
        // Tauri's bundled iOS origin. Prefer the actual initial origin/route
        // when it is already available, including its query and fragment.
        recovery.entryURL = RMTIsRecoveryURL(webView.URL) ? webView.URL :
            [NSURL URLWithString:@"tauri://localhost/index.html"];
        objc_setAssociatedObject(webView, &rmtRecoveryKey, recovery, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    if (webView.navigationDelegate != recovery) {
        // Wry retains its own delegate. WKWebView's delegate reference is weak;
        // the associated object above keeps this wrapper alive without a cycle.
        recovery.originalDelegate = webView.navigationDelegate;
        webView.navigationDelegate = recovery;
    }
    recovery.connected = YES;
    return recovery;
}

- (BOOL)respondsToSelector:(SEL)selector {
    return [super respondsToSelector:selector] || [self.originalDelegate respondsToSelector:selector];
}

- (id)forwardingTargetForSelector:(SEL)selector {
    id delegate = self.originalDelegate;
    if ([delegate respondsToSelector:selector]) return delegate;
    return [super forwardingTargetForSelector:selector];
}

- (void)setActive:(BOOL)active {
    NSAssert(NSThread.isMainThread, @"WebView recovery must run on the main thread");
    if (!self.connected || _active == active) return;
    _active = active;
    self.generation++;
    if (!active) return; // Invalidate outstanding probes and foreground timers.
    if (self.recovering) {
        [self showOverlay:YES];
        [self watchRecovery];
    }
    else if (self.needsRecovery) [self beginRecovery:NO];
    else if (!self.webView.loading) [self probeAttempt:0];
}

- (void)detach {
    self.active = NO;
    self.generation++;
    self.didRecover = nil;
    [self removeOverlay];
}

- (void)disconnect {
    [self detach];
    self.connected = NO;
    WKWebView *webView = self.webView;
    if (webView.navigationDelegate == self) webView.navigationDelegate = self.originalDelegate;
    if (objc_getAssociatedObject(webView, &rmtRecoveryKey) == self)
        objc_setAssociatedObject(webView, &rmtRecoveryKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (void)removeOverlay {
    [self.overlay removeFromSuperview];
    self.overlay = nil;
    self.spinner = nil;
    self.statusLabel = nil;
    self.retryButton = nil;
}

- (void)showOverlay:(BOOL)loading {
    WKWebView *webView = self.webView;
    if (!webView || !self.connected || !self.active) return;
    if (!self.overlay) {
        UIView *overlay = [[UIView alloc] initWithFrame:webView.bounds];
        overlay.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        overlay.backgroundColor = UIColor.systemBackgroundColor;
        overlay.accessibilityIdentifier = @"rmt-webview-recovery";
        self.spinner = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleMedium];
        self.spinner.hidesWhenStopped = YES;
        self.statusLabel = [[UILabel alloc] init];
        self.statusLabel.font = [UIFont preferredFontForTextStyle:UIFontTextStyleBody];
        self.statusLabel.adjustsFontForContentSizeCategory = YES;
        self.statusLabel.textAlignment = NSTextAlignmentCenter;
        self.statusLabel.numberOfLines = 0;
        self.retryButton = [UIButton buttonWithType:UIButtonTypeSystem];
        self.retryButton.titleLabel.font = [UIFont preferredFontForTextStyle:UIFontTextStyleHeadline];
        self.retryButton.titleLabel.adjustsFontForContentSizeCategory = YES;
        self.retryButton.accessibilityIdentifier = @"rmt-webview-retry";
        [self.retryButton addTarget:self action:@selector(retry:) forControlEvents:UIControlEventTouchUpInside];
        [self.retryButton.heightAnchor constraintGreaterThanOrEqualToConstant:44].active = YES;
        UIStackView *stack = [[UIStackView alloc] initWithArrangedSubviews:@[self.spinner, self.statusLabel, self.retryButton]];
        stack.axis = UILayoutConstraintAxisVertical;
        stack.alignment = UIStackViewAlignmentCenter;
        stack.spacing = 16;
        stack.translatesAutoresizingMaskIntoConstraints = NO;
        [overlay addSubview:stack];
        [NSLayoutConstraint activateConstraints:@[
            [stack.centerXAnchor constraintEqualToAnchor:overlay.safeAreaLayoutGuide.centerXAnchor],
            [stack.centerYAnchor constraintEqualToAnchor:overlay.safeAreaLayoutGuide.centerYAnchor],
            [stack.widthAnchor constraintLessThanOrEqualToAnchor:overlay.safeAreaLayoutGuide.widthAnchor constant:-48],
        ]];
        [webView addSubview:overlay];
        self.overlay = overlay;
    }
    self.statusLabel.text = RMTRecoveryText(loading ? 0 : 1);
    [self.retryButton setTitle:RMTRecoveryText(2) forState:UIControlStateNormal];
    self.retryButton.hidden = loading;
    if (loading) [self.spinner startAnimating];
    else [self.spinner stopAnimating];
    [webView bringSubviewToFront:self.overlay];
}

- (void)retry:(id)sender {
    if (self.active && self.connected && !self.recovering) [self beginRecovery:YES];
}

- (void)contentProcessTerminated {
    if (!self.connected) return;
    NSLog(@"[RMTWebViewRecovery] Web content process terminated (active=%d)", self.active);
    // A foreground probe may discover a terminated process before WebKit
    // delivers its delegate notification. Preserve the replacement navigation
    // in that case. A genuine failure of the replacement is bounded by its
    // navigation error/watchdog, without starting another automatic load.
    if (self.recovering) return;
    self.generation++;
    self.needsRecovery = YES;
    self.recovering = NO;
    self.recoveryNavigation = nil;
    self.currentNavigation = nil;
    if (self.active) [self beginRecovery:NO];
}

- (void)beginRecovery:(BOOL)manual {
    WKWebView *webView = self.webView;
    if (!self.connected || !self.active || self.recovering || !webView) return;
    NSTimeInterval now = NSProcessInfo.processInfo.systemUptime;
    self.generation++;
    if (!manual && self.hasAttemptedRecovery && now - self.lastAutomaticRecovery < RMTRecoveryInterval) {
        NSLog(@"[RMTWebViewRecovery] Automatic recovery throttled");
        [self showOverlay:NO];
        return;
    }
    self.hasAttemptedRecovery = YES;
    self.lastAutomaticRecovery = now;
    self.needsRecovery = YES;
    self.recovering = YES;
    self.currentNavigation = nil;
    [self showOverlay:YES];
    [webView stopLoading];
    WKNavigation *navigation = nil;
    if (RMTIsRecoveryURL(webView.URL)) navigation = [webView reload];
    if (!navigation) {
        NSURL *url = self.lastGoodURL ?: self.entryURL;
        navigation = [webView loadRequest:[NSURLRequest requestWithURL:url]];
    }
    self.recoveryNavigation = navigation;
    self.currentNavigation = navigation;
    NSLog(@"[RMTWebViewRecovery] Started %@ recovery", manual ? @"manual" : @"automatic");
    if (navigation) [self watchRecovery];
    else {
        self.recovering = NO;
        [self showOverlay:NO];
    }
}

- (void)watchRecovery {
    NSUInteger generation = self.generation;
    __weak RMTWebViewRecovery *weakSelf = self;
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(RMTNavigationTimeout * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        RMTWebViewRecovery *owner = weakSelf;
        if (!owner.connected || !owner.active || !owner.recovering || owner.generation != generation) return;
        owner.generation++;
        owner.recovering = NO;
        // Keep the navigation identity: a late successful finish may still
        // dismiss this prompt without requiring the user to reload again.
        NSLog(@"[RMTWebViewRecovery] Recovery navigation timed out");
        [owner showOverlay:NO];
    });
}

- (void)probeAttempt:(NSUInteger)attempt {
    if (!self.active || !self.connected || self.recovering || self.needsRecovery || self.webView.loading) return;
    NSUInteger generation = ++self.generation;
    __weak RMTWebViewRecovery *weakSelf = self;
    __block BOOL completed = NO;
    // This probes the content process only. No DOM, iframe, network or app-ready
    // assumptions are used to decide whether the process has terminated.
    [self.webView evaluateJavaScript:@"true" completionHandler:^(id result, NSError *error) {
        RMTWebViewRecovery *owner = weakSelf;
        if (!owner.connected || !owner.active || owner.generation != generation) return;
        completed = YES;
        if (RMTIsTerminatedError(error)) [owner contentProcessTerminated];
        else if (!error && [result isEqual:@YES]) {
            // Cancel a retry already scheduled by this probe's timeout.
            owner.generation++;
            [owner removeOverlay];
        }
        else [owner probeFailed:attempt generation:generation];
    }];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(RMTProbeTimeout * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        RMTWebViewRecovery *owner = weakSelf;
        if (completed || !owner.connected || !owner.active || owner.generation != generation) return;
        [owner probeFailed:attempt generation:generation];
    });
}

- (void)probeFailed:(NSUInteger)attempt generation:(NSUInteger)generation {
    NSLog(@"[RMTWebViewRecovery] Foreground probe did not respond (attempt=%lu)", (unsigned long)attempt + 1);
    if (attempt == 0) {
        __weak RMTWebViewRecovery *weakSelf = self;
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC), dispatch_get_main_queue(), ^{
            RMTWebViewRecovery *owner = weakSelf;
            if (owner.connected && owner.active && owner.generation == generation) [owner probeAttempt:1];
        });
    } else [self showOverlay:NO]; // Ambiguous failure requires an explicit reload.
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    if ([self.originalDelegate respondsToSelector:_cmd])
        [self.originalDelegate webViewWebContentProcessDidTerminate:webView];
    [self contentProcessTerminated];
}

- (void)webView:(WKWebView *)webView didStartProvisionalNavigation:(WKNavigation *)navigation {
    if ([self.originalDelegate respondsToSelector:_cmd])
        [self.originalDelegate webView:webView didStartProvisionalNavigation:navigation];
    if (!self.connected) return;
    self.generation++;
    self.currentNavigation = navigation;
    if (navigation == self.recoveryNavigation) {
        if (self.active && self.recovering) [self watchRecovery];
    } else {
        // A newer, independently initiated navigation supersedes this recovery.
        self.recovering = NO;
        self.needsRecovery = NO;
        self.recoveryNavigation = nil;
        [self removeOverlay];
    }
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if ([self.originalDelegate respondsToSelector:_cmd])
        [self.originalDelegate webView:webView didFinishNavigation:navigation];
    if (!self.connected || (self.currentNavigation && navigation != self.currentNavigation) ||
        (self.needsRecovery && !self.recoveryNavigation)) return;
    if (RMTIsRecoveryURL(webView.URL)) self.lastGoodURL = webView.URL;
    self.generation++;
    BOOL recovered = self.recoveryNavigation && navigation == self.recoveryNavigation;
    self.currentNavigation = nil;
    self.recoveryNavigation = nil;
    self.needsRecovery = NO;
    self.recovering = NO;
    [self removeOverlay];
    if (recovered) {
        NSLog(@"[RMTWebViewRecovery] Recovery navigation finished");
        if (self.didRecover) self.didRecover();
    }
}

- (void)navigation:(WKNavigation *)navigation failed:(NSError *)error {
    if (!self.connected || navigation != self.currentNavigation) return;
    if (RMTIsTerminatedError(error)) {
        // Unlike a duplicate process notification, a failure tied to this
        // replacement navigation conclusively ends the in-flight recovery.
        self.recovering = NO;
        [self contentProcessTerminated];
    }
    else if (navigation == self.recoveryNavigation &&
        !([error.domain isEqualToString:NSURLErrorDomain] && error.code == NSURLErrorCancelled)) {
        self.generation++;
        self.recovering = NO;
        NSLog(@"[RMTWebViewRecovery] Recovery navigation failed (%@/%ld)", error.domain, (long)error.code);
        [self showOverlay:NO];
    }
}

- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    if ([self.originalDelegate respondsToSelector:_cmd])
        [self.originalDelegate webView:webView didFailProvisionalNavigation:navigation withError:error];
    [self navigation:navigation failed:error];
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    if ([self.originalDelegate respondsToSelector:_cmd])
        [self.originalDelegate webView:webView didFailNavigation:navigation withError:error];
    [self navigation:navigation failed:error];
}
@end
