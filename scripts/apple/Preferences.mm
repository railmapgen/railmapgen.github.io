#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

static NSString *const RMTAppearanceKey = @"rmtAppearance";
static NSString *const RMTLanguageKey = @"rmtLanguage";

static NSString *RMTString(id value) {
    return [value isKindOfClass:NSString.class] ? value : nil;
}

static BOOL RMTIsBundledURL(NSURL *url) {
    return ([url.scheme isEqualToString:@"tauri"] && [url.host isEqualToString:@"localhost"]) ||
        (([url.scheme isEqualToString:@"https"] || [url.scheme isEqualToString:@"http"]) &&
            [url.host isEqualToString:@"tauri.localhost"]);
}

static NSArray<NSString *> *RMTLanguages(void) {
    return @[@"en", @"zh-Hans", @"zh-Hant", @"ja", @"ko"];
}

@interface RMTPreferences : NSObject <WKScriptMessageHandler>
@property(nonatomic, strong) NSHashTable<WKWebView *> *webViews;
@property(nonatomic, strong) NSMapTable<WKWebView *, NSString *> *publishedSnapshots;
@property(nonatomic) BOOL refreshing;
- (void)registerWebView:(WKWebView *)webView;
- (void)refresh:(WKWebView * _Nullable)requester;
@end

@implementation RMTPreferences
- (instancetype)init {
    self = [super init];
    if (self) {
        _webViews = [NSHashTable weakObjectsHashTable];
        _publishedSnapshots = [NSMapTable weakToStrongObjectsMapTable];
        [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(defaultsChanged:)
            name:NSUserDefaultsDidChangeNotification object:nil];
        [NSNotificationCenter.defaultCenter addObserver:self selector:@selector(defaultsChanged:)
            name:NSCurrentLocaleDidChangeNotification object:nil];
    }
    return self;
}

- (void)defaultsChanged:(NSNotification *)notification {
    // Settings may change preferences while this process is suspended. Also
    // refresh on scene activation; UserDefaults notifications are process-local.
    dispatch_async(dispatch_get_main_queue(), ^{ [self refresh:nil]; });
}

- (NSDictionary *)snapshotForWebView:(WKWebView *)webView {
    NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
    NSString *appearance = RMTString([defaults objectForKey:RMTAppearanceKey]);
    if (![@[@"light", @"dark", @"system"] containsObject:appearance]) appearance = nil;
    NSString *language = RMTString([defaults objectForKey:RMTLanguageKey]);
    if (![language isEqualToString:@"system"] && ![RMTLanguages() containsObject:language]) language = nil;
    // The bundle declares the web UI's localizations, so this honors iOS's
    // per-app Preferred Language as well as the device's preferred languages.
    NSString *systemLanguage = NSBundle.mainBundle.preferredLocalizations.firstObject;
    if (![RMTLanguages() containsObject:systemLanguage]) systemLanguage = @"en";
    // Window appearance overrides must never become the system preference.
    UITraitCollection *traits = webView.window.windowScene.traitCollection ?: UIScreen.mainScreen.traitCollection;
    NSString *systemAppearance = traits.userInterfaceStyle == UIUserInterfaceStyleDark ? @"dark" : @"light";
    return @{
        @"appearance": appearance ?: @"system", @"language": language ?: @"system",
        @"hasAppearance": @(appearance != nil), @"hasLanguage": @(language != nil),
        @"systemLanguage": systemLanguage, @"systemAppearance": systemAppearance,
    };
}

- (void)publishToWebView:(WKWebView *)webView force:(BOOL)force {
    NSDictionary *snapshot = [self snapshotForWebView:webView];
    NSString *appearance = snapshot[@"appearance"];
    UIUserInterfaceStyle style = UIUserInterfaceStyleUnspecified;
    if ([appearance isEqualToString:@"light"]) style = UIUserInterfaceStyleLight;
    if ([appearance isEqualToString:@"dark"]) style = UIUserInterfaceStyleDark;
    UIWindow *window = webView.window;
    if (window.overrideUserInterfaceStyle != style) window.overrideUserInterfaceStyle = style;
    BOOL dark = [appearance isEqualToString:@"dark"] ||
        ([appearance isEqualToString:@"system"] && [snapshot[@"systemAppearance"] isEqualToString:@"dark"]);
    // Match Mantine's light body and default dark[7], including exposed native
    // pixels during rotation, navigation, keyboard transitions, and startup.
    UIColor *background = dark ? [UIColor colorWithWhite:36.0 / 255.0 alpha:1] : UIColor.whiteColor;
    window.backgroundColor = background;
    window.rootViewController.view.backgroundColor = background;
    webView.opaque = NO;
    webView.backgroundColor = background;
    webView.scrollView.backgroundColor = background;
    if (!RMTIsBundledURL(webView.URL)) return;
    NSData *data = [NSJSONSerialization dataWithJSONObject:snapshot options:NSJSONWritingSortedKeys error:nil];
    NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!force && [[self.publishedSnapshots objectForKey:webView] isEqualToString:json]) return;
    [self.publishedSnapshots setObject:json forKey:webView];
    NSString *script = [NSString stringWithFormat:
        @"window.__RMT_NATIVE_PREFERENCES__=%@;window.dispatchEvent(new CustomEvent('rmt-native-preferences',{detail:window.__RMT_NATIVE_PREFERENCES__}));", json];
    [webView evaluateJavaScript:script completionHandler:nil];
}

- (void)refresh:(WKWebView *)requester {
    if (self.refreshing) return;
    self.refreshing = YES;
    for (WKWebView *webView in self.webViews) [self publishToWebView:webView force:webView == requester];
    self.refreshing = NO;
}

- (void)registerWebView:(WKWebView *)webView {
    if (![self.webViews containsObject:webView]) {
        [self.webViews addObject:webView];
        WKUserContentController *controller = webView.configuration.userContentController;
        [controller addScriptMessageHandler:self name:@"rmtPreferences"];
        // Request current defaults for every navigation. Embedding a snapshot
        // here would retain stale settings when the WebView later reloads.
        NSString *source = @"window.webkit.messageHandlers.rmtPreferences.postMessage({type:'get'});";
        [controller addUserScript:[[WKUserScript alloc] initWithSource:source
            injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:YES]];
    }
    [self publishToWebView:webView force:NO];
}

- (void)userContentController:(WKUserContentController *)controller didReceiveScriptMessage:(WKScriptMessage *)message {
    if (!message.frameInfo.mainFrame || !RMTIsBundledURL(message.frameInfo.request.URL) ||
        ![message.body isKindOfClass:NSDictionary.class]) return;
    NSDictionary *body = message.body;
    NSString *type = RMTString(body[@"type"]);
    BOOL setting = [type isEqualToString:@"set"];
    if (!setting && ![type isEqualToString:@"get"]) return;
    NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
    // An initial frontend get may migrate existing persisted web preferences.
    // Once native values exist, Settings and in-app changes share that value.
    NSString *appearance = RMTString(body[@"appearance"]);
    if ([@[@"light", @"dark", @"system"] containsObject:appearance] &&
        (setting || [defaults objectForKey:RMTAppearanceKey] == nil))
        [defaults setObject:appearance forKey:RMTAppearanceKey];
    NSString *language = RMTString(body[@"language"]);
    if (([RMTLanguages() containsObject:language] || [language isEqualToString:@"system"]) &&
        (setting || [defaults objectForKey:RMTLanguageKey] == nil))
        [defaults setObject:language forKey:RMTLanguageKey];
    [self refresh:message.webView];
}
@end

static RMTPreferences *RMTSharedPreferences(void) {
    static RMTPreferences *preferences;
    static dispatch_once_t once;
    dispatch_once(&once, ^{ preferences = [[RMTPreferences alloc] init]; });
    return preferences;
}

void RMTRegisterPreferencesWebView(WKWebView *webView) {
    [RMTSharedPreferences() registerWebView:webView];
}

void RMTRefreshPreferences(void) {
    [RMTSharedPreferences() refresh:nil];
}
