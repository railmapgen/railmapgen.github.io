#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import "WebViewRecovery.h"

void RMTRegisterPreferencesWebView(WKWebView *webView);
void RMTRefreshPreferences(void);

@class RMTSceneDelegate;
@interface RMTViewportProbe : UIView
@property(nonatomic, weak) RMTSceneDelegate *owner;
@property(nonatomic, weak) WKWebView *webView;
@end

// Tao 0.34 creates the application's UIWindow and owns its view controller.
// Connect that exact window to UIKit's scene lifecycle; never create a second
// window or WebView. Required for applications linked with the iOS 27 SDK.
@interface RMTSceneDelegate : UIResponder <UIWindowSceneDelegate, WKScriptMessageHandler>
@property(nonatomic, strong) UIWindow *window;
@property(nonatomic, weak) UIWindowScene *scene;
@property(nonatomic, strong) NSHashTable<WKWebView *> *observedWebViews;
@property(nonatomic, strong) NSMapTable<WKWebView *, RMTViewportProbe *> *viewportProbes;
+ (void)registerWindow:(UIWindow *)window;
+ (void)registerWebView:(WKWebView *)webView;
- (void)attachWindow;
- (void)publishInsets:(UIEdgeInsets)insets forWebView:(WKWebView *)webView;
@end

static UIWindow *rmtMainWindow;
static __weak RMTSceneDelegate *rmtConnectedDelegate;
static NSMapTable<WKWebView *, RMTViewportProbe *> *rmtAttachmentProbes;

@implementation RMTViewportProbe
- (void)didMoveToWindow {
    [super didMoveToWindow];
    UIWindow *window = self.window;
    if (!window) return;
    // Tauri can configure a WKWebView before UIKit attaches it. Observe the
    // actual attachment, then leave UIKit's move callback before associating
    // the Tao controller with its scene.
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.window == window) [RMTSceneDelegate registerWindow:window];
    });
}
- (void)safeAreaInsetsDidChange {
    [super safeAreaInsetsDidChange];
    [self setNeedsUpdateConstraints];
}
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection {
    [super traitCollectionDidChange:previousTraitCollection];
    RMTRefreshPreferences();
}
- (void)layoutSubviews {
    [super layoutSubviews];
    [self setNeedsUpdateConstraints];
}
- (void)updateConstraints {
    [super updateConstraints];
    if (self.traitCollection.userInterfaceIdiom != UIUserInterfaceIdiomPad) return;
    UIEdgeInsets insets = self.safeAreaInsets;
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 270100
    if (@available(iOS 27.1, *)) {
        // UIKit's measured regions include window-button touch margins. The
        // host crops one shared content viewport below the top obstructions;
        // the native WebView itself still covers the complete window.
        // The app's 40pt header only identifies adjacent chrome, not inset size.
        NSMutableArray<UIViewReservedRegion *> *rowControls = [NSMutableArray array];
        for (UIViewReservedRegion *region in [self reservedRegionsOfKind:[UIViewReservedRegionKind occlusionRegionKind]]) {
            if (!region.active) continue;
            CGRect clipped = CGRectIntersection(self.bounds, region.frame);
            if (CGRectIsEmpty(clipped) || CGRectIsNull(clipped)) continue;
            BOOL fullHeight = CGRectGetMinY(clipped) <= CGRectGetMinY(self.bounds) && CGRectGetMaxY(clipped) >= CGRectGetMaxY(self.bounds);
            BOOL fullWidth = CGRectGetMinX(clipped) <= CGRectGetMinX(self.bounds) && CGRectGetMaxX(clipped) >= CGRectGetMaxX(self.bounds);
            // A vertical system strip is a horizontal exclusion, not a toolbar
            // height. Ignore regions covering the whole window (e.g. overlays).
            if (fullHeight && !fullWidth) {
                if (CGRectGetMinX(clipped) <= CGRectGetMinX(self.bounds)) insets.left = MAX(insets.left, CGRectGetMaxX(clipped));
                if (CGRectGetMaxX(clipped) >= CGRectGetMaxX(self.bounds)) insets.right = MAX(insets.right, self.bounds.size.width - CGRectGetMinX(clipped));
            } else if (fullWidth && !fullHeight) {
                if (CGRectGetMinY(clipped) <= CGRectGetMinY(self.bounds)) insets.top = MAX(insets.top, CGRectGetMaxY(clipped));
                if (CGRectGetMaxY(clipped) >= CGRectGetMaxY(self.bounds)) insets.bottom = MAX(insets.bottom, self.bounds.size.height - CGRectGetMinY(clipped));
            } else if (!fullHeight && !fullWidth) {
                CGRect control = UIEdgeInsetsInsetRect(region.frame, region.margins);
                if (!CGRectIsEmpty(control) && control.size.height <= 40) [rowControls addObject:region];
            }
        }
        CGRect toolbar = CGRectMake(0, 0, self.bounds.size.width, insets.top + 40);
        for (UIViewReservedRegion *region in rowControls)
            if (CGRectIntersectsRect(toolbar, region.frame))
                insets.top = MAX(insets.top, CGRectGetMaxY(CGRectIntersection(self.bounds, region.frame)));
    }
#endif
    [self.owner publishInsets:insets forWebView:self.webView];
}
@end

@implementation RMTSceneDelegate
- (void)publishInsets:(UIEdgeInsets)insets forWebView:(WKWebView *)webView {
    NSArray<NSString *> *edges = @[@"top", @"right", @"bottom", @"left"];
    NSArray<NSNumber *> *values = @[@(insets.top), @(insets.right), @(insets.bottom), @(insets.left)];
    NSMutableString *script = [NSMutableString stringWithString:@"{const r=document.documentElement;if(r){"];
    for (NSUInteger i = 0; i < edges.count; i++) {
        NSString *property = [@"--rmt-physical-safe-area-" stringByAppendingString:edges[i]];
        NSString *value = [values[i].stringValue stringByAppendingString:@"px"];
        [script appendFormat:@"if(r.style.getPropertyValue('%@')!=='%@')r.style.setProperty('%@','%@');", property, value, property, value];
    }
    [script appendString:@"}}"];
    [webView evaluateJavaScript:script completionHandler:nil];
}

- (void)publishNotchSide:(WKWebView *)webView {
    NSString *device = @"";
    NSString *side = @"";
    if (self.window.traitCollection.userInterfaceIdiom == UIUserInterfaceIdiomPhone) {
        device = @"phone";
        side = @"top";
        if (self.scene.interfaceOrientation == UIInterfaceOrientationLandscapeRight) side = @"left";
        if (self.scene.interfaceOrientation == UIInterfaceOrientationLandscapeLeft) side = @"right";
    } else if (self.window.traitCollection.userInterfaceIdiom == UIUserInterfaceIdiomPad) {
        device = @"pad";
    }
    NSString *script = [NSString stringWithFormat:
        @"{const r=document.documentElement;if(r){"
         "if(r.dataset.rmtDevice!=='%@')r.dataset.rmtDevice='%@';"
         "if(r.dataset.rmtNotchSide!=='%@')r.dataset.rmtNotchSide='%@';}}", device, device, side, side];
    [webView evaluateJavaScript:script completionHandler:nil];
}

- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if (message.frameInfo.mainFrame) {
        [self publishNotchSide:message.webView];
        [[self.viewportProbes objectForKey:message.webView] setNeedsUpdateConstraints];
    }
}

- (void)layoutWebViewsIn:(UIView *)view {
    if ([view isKindOfClass:[WKWebView class]]) {
        view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        if (!CGRectEqualToRect(view.frame, view.superview.bounds)) view.frame = view.superview.bounds;
        WKWebView *webView = (WKWebView *)view;
        [RMTSceneDelegate registerWebView:webView];
        if (!self.viewportProbes) self.viewportProbes = [NSMapTable weakToStrongObjectsMapTable];
        RMTViewportProbe *probe = [rmtAttachmentProbes objectForKey:webView];
        probe.owner = self;
        [self.viewportProbes setObject:probe forKey:webView];
        RMTWebViewRecovery *recovery = [RMTWebViewRecovery registerWebView:webView];
        __weak RMTSceneDelegate *owner = self;
        recovery.didRecover = ^{
            [owner attachWindow];
            RMTRefreshPreferences();
        };
        if (!CGRectEqualToRect(probe.frame, view.bounds)) probe.frame = view.bounds;
        [probe setNeedsUpdateConstraints];
        if (!self.observedWebViews) self.observedWebViews = [NSHashTable weakObjectsHashTable];
        if (![self.observedWebViews containsObject:webView]) {
            [self.observedWebViews addObject:webView];
            WKUserContentController *controller = webView.configuration.userContentController;
            [controller addScriptMessageHandler:self name:@"rmtViewport"];
            NSString *source = @"window.webkit.messageHandlers.rmtViewport.postMessage(null);";
            BOOL installed = NO;
            for (WKUserScript *script in controller.userScripts)
                if ([script.source isEqualToString:source]) installed = YES;
            if (!installed) [controller addUserScript:[[WKUserScript alloc] initWithSource:source
                injectionTime:WKUserScriptInjectionTimeAtDocumentEnd forMainFrameOnly:YES]];
        }
        // Device identity and scene orientation select the host's common
        // protected edge: phone portrait top, phone landscape cutout side,
        // and iPad's UIKit-measured top region. Other edges stay full bleed.
        [self publishNotchSide:webView];
        // Tauri may attach its window after the scene has already activated.
        // Registration during layout is frequent; setActive is idempotent.
        [recovery setActive:self.scene.activationState == UISceneActivationStateForegroundActive];
        return;
    }
    for (UIView *child in [view.subviews copy]) [self layoutWebViewsIn:child];
}

+ (void)registerWebView:(WKWebView *)webView {
    NSAssert([NSThread isMainThread], @"The Tauri WebView must be registered on the main thread");
    RMTRegisterPreferencesWebView(webView);
    [RMTWebViewRecovery registerWebView:webView];
    if (!rmtAttachmentProbes) rmtAttachmentProbes = [NSMapTable weakToWeakObjectsMapTable];
    RMTViewportProbe *probe = [rmtAttachmentProbes objectForKey:webView];
    if (!probe) {
        probe = [[RMTViewportProbe alloc] initWithFrame:webView.bounds];
        probe.webView = webView;
        probe.userInteractionEnabled = NO;
        probe.accessibilityElementsHidden = YES;
        probe.backgroundColor = UIColor.clearColor;
        probe.opaque = NO;
        probe.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
        [rmtAttachmentProbes setObject:probe forKey:webView];
        [webView addSubview:probe];
    }
}

+ (void)registerWindow:(UIWindow *)window {
    NSAssert([NSThread isMainThread], @"The Tauri window must be registered on the main thread");
    if (!window) return;
    id delegate = window.windowScene.delegate;
    if ([delegate isKindOfClass:self]) {
        rmtConnectedDelegate = delegate;
        rmtConnectedDelegate.scene = window.windowScene;
    }
    BOOL needsAttachment = rmtMainWindow != window || rmtConnectedDelegate.window != window ||
        (rmtConnectedDelegate.scene && window.windowScene != rmtConnectedDelegate.scene);
    rmtMainWindow = window;
    if (needsAttachment) [rmtConnectedDelegate attachWindow];
    RMTRefreshPreferences();
}

- (void)attachWindow {
    if (!self.scene || !rmtMainWindow) return;
    BOOL firstAttachment = self.window != rmtMainWindow || rmtMainWindow.windowScene != self.scene;
    self.window = rmtMainWindow;
    if (self.window.windowScene != self.scene) {
        // The legacy Tao host installed its controller before a scene existed.
        // Reinstall it only after association, letting UIKit initialize scene
        // orientation and safe-area geometry rather than retaining portrait
        // metrics from the pre-scene window.
        UIViewController *controller = self.window.rootViewController;
        self.window.rootViewController = nil;
        self.window.windowScene = self.scene;
        self.window.frame = self.scene.coordinateSpace.bounds;
        self.window.rootViewController = controller;
    }
    UIView *root = self.window.rootViewController.view;
    root.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    if (!CGRectEqualToRect(root.frame, self.window.bounds)) root.frame = self.window.bounds;
    [self layoutWebViewsIn:root];
    if (firstAttachment) [self.window makeKeyAndVisible];
    [root setNeedsLayout];
    [root layoutIfNeeded];
}

- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
    if (![scene isKindOfClass:[UIWindowScene class]]) return;
    self.scene = (UIWindowScene *)scene;
    rmtConnectedDelegate = self;
    [self attachWindow];
}

- (void)sceneDidBecomeActive:(UIScene *)scene {
    [self attachWindow];
    RMTRefreshPreferences();
    // With scenes enabled UIKit no longer calls these AppDelegate methods.
    // Tao uses them to emit its Resumed/Suspended events and update focus.
    UIApplication *app = UIApplication.sharedApplication;
    if ([app.delegate respondsToSelector:@selector(applicationDidBecomeActive:)])
        [app.delegate applicationDidBecomeActive:app];
    for (WKWebView *webView in self.observedWebViews)
        [[RMTWebViewRecovery registerWebView:webView] setActive:YES];
}

- (void)sceneWillResignActive:(UIScene *)scene {
    for (WKWebView *webView in self.observedWebViews)
        [[RMTWebViewRecovery registerWebView:webView] setActive:NO];
    UIApplication *app = UIApplication.sharedApplication;
    if ([app.delegate respondsToSelector:@selector(applicationWillResignActive:)])
        [app.delegate applicationWillResignActive:app];
}

- (void)sceneWillEnterForeground:(UIScene *)scene {
    UIApplication *app = UIApplication.sharedApplication;
    if ([app.delegate respondsToSelector:@selector(applicationWillEnterForeground:)])
        [app.delegate applicationWillEnterForeground:app];
}

- (void)sceneDidEnterBackground:(UIScene *)scene {
    UIApplication *app = UIApplication.sharedApplication;
    if ([app.delegate respondsToSelector:@selector(applicationDidEnterBackground:)])
        [app.delegate applicationDidEnterBackground:app];
}

- (void)windowScene:(UIWindowScene *)scene didUpdateCoordinateSpace:(id<UICoordinateSpace>)previousCoordinateSpace interfaceOrientation:(UIInterfaceOrientation)previousInterfaceOrientation traitCollection:(UITraitCollection *)previousTraitCollection {
    // Scene geometry, rather than UIScreen.main, defines iPad window sizes.
    [self attachWindow];
}

#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 260000
- (void)windowScene:(UIWindowScene *)scene didUpdateEffectiveGeometry:(UIWindowSceneGeometry *)previousEffectiveGeometry API_AVAILABLE(ios(26.0)) {
    [self attachWindow];
}
#endif

- (void)sceneDidDisconnect:(UIScene *)scene {
    for (WKWebView *webView in self.observedWebViews)
        [[RMTWebViewRecovery registerWebView:webView] detach];
    for (RMTViewportProbe *probe in self.viewportProbes.objectEnumerator) [probe removeFromSuperview];
    self.viewportProbes = nil;
    for (WKWebView *view in self.observedWebViews)
        [view.configuration.userContentController removeScriptMessageHandlerForName:@"rmtViewport"];
    self.observedWebViews = nil;
    self.window.hidden = YES;
    self.window.windowScene = nil;
    self.window = nil;
    if (rmtConnectedDelegate == self) rmtConnectedDelegate = nil;
    self.scene = nil;
}
@end
