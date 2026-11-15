#import <XCTest/XCTest.h>
#import "../WebViewRecovery.h"
#import <objc/message.h>
#import <signal.h>

// Exercise the real coordinator and UIKit views without depending on a website,
// networking, or nondeterministic OS memory pressure. Each load has a distinct
// navigation identity, just like WKWebView's asynchronous navigation callbacks.
@interface RMTRecoveryFakeWebView : WKWebView
@property(nonatomic, copy) NSURL *testURL;
@property(nonatomic) BOOL testLoading;
@property(nonatomic) NSUInteger reloadCount;
@property(nonatomic) NSUInteger requestCount;
@property(nonatomic, strong) NSURLRequest *lastRequest;
@property(nonatomic, strong) WKNavigation *lastNavigation;
@property(nonatomic) BOOL holdProbe;
@property(nonatomic, strong) NSError *probeError;
@property(nonatomic, copy) void (^pendingProbe)(id, NSError *);
@end

@implementation RMTRecoveryFakeWebView
- (NSURL *)URL { return self.testURL; }
- (BOOL)isLoading { return self.testLoading; }
- (WKNavigation *)newNavigation {
    self.testLoading = YES;
    self.lastNavigation = (WKNavigation *)[NSObject new];
    return self.lastNavigation;
}
- (WKNavigation *)reload {
    self.reloadCount += 1;
    return [self newNavigation];
}
- (WKNavigation *)loadRequest:(NSURLRequest *)request {
    self.requestCount += 1;
    self.lastRequest = request;
    self.testURL = request.URL;
    return [self newNavigation];
}
- (void)evaluateJavaScript:(NSString *)script completionHandler:(void (^)(id, NSError *))completion {
    if (self.holdProbe) self.pendingProbe = completion;
    else if (completion) completion(@YES, self.probeError);
}
@end

@interface RMTRecoveryDelegateSpy : NSObject <WKNavigationDelegate>
@property(nonatomic) NSUInteger terminationCount;
@property(nonatomic) NSUInteger finishedCount;
@property(nonatomic) NSUInteger committedCount;
@property(nonatomic) NSUInteger redirectCount;
@property(nonatomic) NSUInteger policyCount;
@end

@implementation RMTRecoveryDelegateSpy
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView { self.terminationCount += 1; }
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation { self.finishedCount += 1; }
- (void)webView:(WKWebView *)webView didCommitNavigation:(WKNavigation *)navigation { self.committedCount += 1; }
- (void)webView:(WKWebView *)webView didReceiveServerRedirectForProvisionalNavigation:(WKNavigation *)navigation {
    self.redirectCount += 1;
}
- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action
    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    self.policyCount += 1;
    decisionHandler(WKNavigationActionPolicyCancel);
}
@end

@interface WebViewRecoveryTests : XCTestCase
@property(nonatomic, strong) RMTRecoveryFakeWebView *webView;
@property(nonatomic, strong) RMTRecoveryDelegateSpy *originalDelegate;
@property(nonatomic, strong) RMTWebViewRecovery *recovery;
@property(nonatomic) NSUInteger recoveredCount;
@end

@implementation WebViewRecoveryTests
- (void)setUp {
    [super setUp];
    XCTAssertTrue(NSThread.isMainThread);
    self.webView = [[RMTRecoveryFakeWebView alloc] initWithFrame:CGRectMake(0, 0, 390, 700)
        configuration:[WKWebViewConfiguration new]];
    self.webView.testURL = [NSURL URLWithString:@"tauri://localhost/index.html?app=rmp"];
    self.originalDelegate = [RMTRecoveryDelegateSpy new];
    self.webView.navigationDelegate = self.originalDelegate;
    for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
        if (![scene isKindOfClass:UIWindowScene.class]) continue;
        UIWindow *window = ((UIWindowScene *)scene).windows.firstObject;
        [window.rootViewController.view addSubview:self.webView];
        break;
    }
    self.recovery = [RMTWebViewRecovery registerWebView:self.webView];
    __weak WebViewRecoveryTests *weakSelf = self;
    self.recovery.didRecover = ^{ weakSelf.recoveredCount += 1; };
}

- (void)tearDown {
    [self.recovery disconnect];
    [self.webView removeFromSuperview];
    self.recovery = nil;
    self.webView = nil;
    self.originalDelegate = nil;
    [super tearDown];
}

- (void)drainMainQueue {
    XCTestExpectation *drained = [self expectationWithDescription:@"main queue drained"];
    dispatch_async(dispatch_get_main_queue(), ^{ [drained fulfill]; });
    [self waitForExpectations:@[drained] timeout:2];
}

- (void)finishRecoveryNavigation {
    WKNavigation *navigation = self.webView.lastNavigation;
    [self.webView.navigationDelegate webView:self.webView didStartProvisionalNavigation:navigation];
    self.webView.testLoading = NO;
    [self.webView.navigationDelegate webView:self.webView didFinishNavigation:navigation];
    [self drainMainQueue];
}

- (UIView *)viewWithIdentifier:(NSString *)identifier inView:(UIView *)view {
    if ([view.accessibilityIdentifier isEqualToString:identifier]) return view;
    for (UIView *child in view.subviews) {
        UIView *match = [self viewWithIdentifier:identifier inView:child];
        if (match) return match;
    }
    return nil;
}

- (void)testNormalForegroundTransitionsKeepTheExistingPage {
    [self.recovery setActive:YES];
    [self drainMainQueue];
    [self.recovery setActive:NO];
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 0u);
    XCTAssertEqual(self.webView.requestCount, 0u);
}

- (void)testBackgroundTerminationWaitsForActivationAndLoadsOnce {
    [self.recovery setActive:NO];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 0u);
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    [self finishRecoveryNavigation];
    XCTAssertEqual(self.recoveredCount, 1u);
}

- (void)testForegroundTerminationRecoversAndForwardsToOriginalDelegate {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    XCTAssertEqual(self.originalDelegate.terminationCount, 1u);
    [self finishRecoveryNavigation];
    XCTAssertEqual(self.originalDelegate.finishedCount, 1u);
    XCTAssertEqual(self.recoveredCount, 1u);
}

- (void)testRegistrationIsIdempotentAndDisconnectRestoresTheOriginalDelegate {
    XCTAssertEqual([RMTWebViewRecovery registerWebView:self.webView], self.recovery);
    XCTAssertEqual(self.webView.navigationDelegate, self.recovery);
    [self.recovery disconnect];
    XCTAssertEqual(self.webView.navigationDelegate, self.originalDelegate);
    self.recovery = [RMTWebViewRecovery registerWebView:self.webView];
    XCTAssertEqual(self.webView.navigationDelegate, self.recovery);
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqual(self.originalDelegate.terminationCount, 1u);
    XCTAssertEqual(self.webView.reloadCount, 1u);
}

- (void)testOptionalNavigationCallbacksAndDecisionHandlersAreForwardedOnce {
    id<WKNavigationDelegate> delegate = self.webView.navigationDelegate;
    SEL redirect = @selector(webView:didReceiveServerRedirectForProvisionalNavigation:);
    XCTAssertTrue([delegate respondsToSelector:redirect]);
    [delegate webView:self.webView didReceiveServerRedirectForProvisionalNavigation:nil];
    XCTAssertEqual(self.originalDelegate.redirectCount, 1u);
    [delegate webView:self.webView didCommitNavigation:nil];
    XCTAssertEqual(self.originalDelegate.committedCount, 1u);
    __block NSUInteger decisions = 0;
    WKNavigationAction *action = (WKNavigationAction *)[NSObject new];
    [delegate webView:self.webView decidePolicyForNavigationAction:action decisionHandler:^(WKNavigationActionPolicy policy) {
        decisions += 1;
        XCTAssertEqual(policy, WKNavigationActionPolicyCancel);
    }];
    XCTAssertEqual(self.originalDelegate.policyCount, 1u);
    XCTAssertEqual(decisions, 1u);
}

- (void)testRepeatedTerminationIsThrottledAfterACompletedRecovery {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    [self finishRecoveryNavigation];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    XCTAssertEqual(self.originalDelegate.terminationCount, 2u);
    UIControl *retry = (UIControl *)[self viewWithIdentifier:@"rmt-webview-retry" inView:self.webView];
    XCTAssertNotNil(retry);
    XCTAssertFalse(retry.hidden);
    [retry sendActionsForControlEvents:UIControlEventTouchUpInside];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 2u);
}

- (void)testLostURLUsesPreviouslyRecordedTrustedApplicationAddress {
    NSURL *lastURL = self.webView.testURL;
    self.webView.testURL = nil;
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqualObjects(self.webView.lastRequest.URL, lastURL);
    XCTAssertEqual(self.webView.requestCount, 1u);
}

- (void)testExplicitProcessTerminationFromForegroundProbeTriggersRecovery {
    self.webView.probeError = [NSError errorWithDomain:WKErrorDomain code:WKErrorWebContentProcessTerminated userInfo:nil];
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
}

- (void)testProbeAndDelegateTerminationForTheSameProcessKeepTheRecoveryNavigation {
    self.webView.probeError = [NSError errorWithDomain:WKErrorDomain code:WKErrorWebContentProcessTerminated userInfo:nil];
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    [self finishRecoveryNavigation];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    XCTAssertEqual(self.recoveredCount, 1u);
}

- (void)testRecoveryCanFinishWhileDetachedAndReconnectWithoutReloading {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    [self.recovery detach];
    XCTAssertEqual(self.webView.navigationDelegate, self.recovery);
    [self finishRecoveryNavigation];
    self.recovery = [RMTWebViewRecovery registerWebView:self.webView];
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
    XCTAssertEqual(self.originalDelegate.finishedCount, 1u);
}

- (void)testTerminationWhileDetachedIsRecoveredWhenTheSceneReconnects {
    [self.recovery setActive:YES];
    [self.recovery detach];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 0u);
    self.recovery = [RMTWebViewRecovery registerWebView:self.webView];
    [self.recovery setActive:YES];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
}

- (void)testReconnectingDuringRecoveryRestoresTheNativeProgressOverlay {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    [self.recovery detach];
    XCTAssertNil([self viewWithIdentifier:@"rmt-webview-recovery" inView:self.webView]);
    self.recovery = [RMTWebViewRecovery registerWebView:self.webView];
    [self.recovery setActive:YES];
    XCTAssertNotNil([self viewWithIdentifier:@"rmt-webview-recovery" inView:self.webView]);
    UIView *retry = [self viewWithIdentifier:@"rmt-webview-retry" inView:self.webView];
    XCTAssertTrue(retry.hidden);
    XCTAssertEqual(self.webView.reloadCount, 1u);
    [self finishRecoveryNavigation];
    XCTAssertNil([self viewWithIdentifier:@"rmt-webview-recovery" inView:self.webView]);
}

- (void)testProbeErrorAfterDeactivationCannotReloadInBackground {
    self.webView.holdProbe = YES;
    [self.recovery setActive:YES];
    [self drainMainQueue];
    void (^probe)(id, NSError *) = self.webView.pendingProbe;
    XCTAssertNotNil(probe);
    [self.recovery setActive:NO];
    probe(nil, [NSError errorWithDomain:WKErrorDomain code:WKErrorWebContentProcessTerminated userInfo:nil]);
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 0u);
}

- (void)testStaleNavigationCompletionCannotFinishTheRecovery {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    WKNavigation *unrelated = (WKNavigation *)[NSObject new];
    [self.webView.navigationDelegate webView:self.webView didFinishNavigation:unrelated];
    [self drainMainQueue];
    XCTAssertEqual(self.recoveredCount, 0u);
    [self finishRecoveryNavigation];
    XCTAssertEqual(self.recoveredCount, 1u);
}

- (void)testStaleNavigationFailureCannotAbortTheRecovery {
    [self.recovery setActive:YES];
    [self.webView.navigationDelegate webViewWebContentProcessDidTerminate:self.webView];
    [self drainMainQueue];
    WKNavigation *unrelated = (WKNavigation *)[NSObject new];
    NSError *cancelled = [NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCancelled userInfo:nil];
    [self.webView.navigationDelegate webView:self.webView didFailProvisionalNavigation:unrelated withError:cancelled];
    [self drainMainQueue];
    [self finishRecoveryNavigation];
    XCTAssertEqual(self.recoveredCount, 1u);
}

- (void)testAmbiguousProbeFailureOffersNativeRetryWithoutAutomaticallyReloading {
    self.webView.probeError = [NSError errorWithDomain:WKErrorDomain code:WKErrorJavaScriptExceptionOccurred userInfo:nil];
    [self.recovery setActive:YES];
    NSPredicate *visibleRetry = [NSPredicate predicateWithBlock:^BOOL(id object, NSDictionary *bindings) {
        UIView *retry = [self viewWithIdentifier:@"rmt-webview-retry" inView:self.webView];
        return retry && !retry.hidden;
    }];
    XCTestExpectation *offered = [self expectationForPredicate:visibleRetry evaluatedWithObject:self.webView handler:nil];
    [self waitForExpectations:@[offered] timeout:4];
    XCTAssertEqual(self.webView.reloadCount, 0u);
    UIControl *retry = (UIControl *)[self viewWithIdentifier:@"rmt-webview-retry" inView:self.webView];
    [retry sendActionsForControlEvents:UIControlEventTouchUpInside];
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 1u);
}

- (void)testProbeErrorFromBeforeANewNavigationCannotReloadTheNewPage {
    self.webView.holdProbe = YES;
    [self.recovery setActive:YES];
    [self drainMainQueue];
    void (^probe)(id, NSError *) = self.webView.pendingProbe;
    XCTAssertNotNil(probe);
    WKNavigation *newNavigation = (WKNavigation *)[NSObject new];
    [self.webView.navigationDelegate webView:self.webView didStartProvisionalNavigation:newNavigation];
    probe(nil, [NSError errorWithDomain:WKErrorDomain code:WKErrorWebContentProcessTerminated userInfo:nil]);
    [self drainMainQueue];
    XCTAssertEqual(self.webView.reloadCount, 0u);
}
@end

@interface RMTRecoverySchemeHandler : NSObject <WKURLSchemeHandler>
@end

@implementation RMTRecoverySchemeHandler
- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)task {
    NSData *data = [@"<!doctype html><html><body>native-recovery-test</body></html>" dataUsingEncoding:NSUTF8StringEncoding];
    [task didReceiveResponse:[[NSURLResponse alloc] initWithURL:task.request.URL MIMEType:@"text/html"
        expectedContentLength:data.length textEncodingName:@"UTF-8"]];
    [task didReceiveData:data];
    [task didFinish];
}
- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)task {}
@end

@interface RMTRealRecoveryDelegate : NSObject <WKNavigationDelegate>
@property(nonatomic, copy) void (^finished)(void);
@property(nonatomic, copy) void (^terminated)(void);
@end

@implementation RMTRealRecoveryDelegate
- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    if (self.finished) self.finished();
}
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    if (self.terminated) self.terminated();
}
@end

@interface RealWebContentRecoveryTests : XCTestCase
@end

@implementation RealWebContentRecoveryTests
- (void)checkRecoveryAfterRendererTerminationWhileActive:(BOOL)active {
    WKWebViewConfiguration *configuration = [WKWebViewConfiguration new];
    configuration.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    configuration.processPool = [WKProcessPool new];
#pragma clang diagnostic pop
    [configuration setURLSchemeHandler:[RMTRecoverySchemeHandler new] forURLScheme:@"tauri"];
    WKWebView *webView = [[WKWebView alloc] initWithFrame:CGRectMake(0, 0, 390, 700) configuration:configuration];
    RMTRealRecoveryDelegate *delegate = [RMTRealRecoveryDelegate new];
    webView.navigationDelegate = delegate;
    RMTWebViewRecovery *recovery = [RMTWebViewRecovery registerWebView:webView];
    @try {
        for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
            if (![scene isKindOfClass:UIWindowScene.class]) continue;
            UIWindow *window = ((UIWindowScene *)scene).windows.firstObject;
            [window.rootViewController.view addSubview:webView];
            break;
        }
        XCTestExpectation *loaded = [self expectationWithDescription:@"initial local document loaded"];
        delegate.finished = ^{ [loaded fulfill]; };
        [webView loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"tauri://localhost/index.html"]]];
        [self waitForExpectations:@[loaded] timeout:20];
        delegate.finished = nil;
        [recovery setActive:active];

        // There is no public API for injecting a real renderer death. This
        // guarded lookup exists only in the isolated test target. It selects
        // this freshly-created WebView's PID, never all WebKit processes.
        SEL processIdentifier = NSSelectorFromString(@"_webProcessIdentifier");
        XCTSkipIf(![webView respondsToSelector:processIdentifier], @"This WebKit does not expose a testable renderer PID.");
        pid_t pid = ((pid_t (*)(id, SEL))objc_msgSend)(webView, processIdentifier);
        XCTSkipIf(pid <= 1 || pid == NSProcessInfo.processInfo.processIdentifier,
            @"This WebKit did not provide a safe renderer PID.");
        XCTestExpectation *terminated = [self expectationWithDescription:@"real renderer termination forwarded"];
        XCTestExpectation *restored = [self expectationWithDescription:@"local document restored in the same WebView"];
        __block NSUInteger recoveryCount = 0;
        delegate.terminated = ^{ [terminated fulfill]; };
        recovery.didRecover = ^{
            recoveryCount += 1;
            [restored fulfill];
        };
        XCTAssertEqual(kill(pid, SIGKILL), 0, @"Could not terminate this test WebView's content process");
        if (active) [self waitForExpectations:@[terminated, restored] timeout:25];
        else {
            [self waitForExpectations:@[terminated] timeout:15];
            XCTAssertEqual(recoveryCount, 0u);
            [recovery setActive:YES];
            [self waitForExpectations:@[restored] timeout:25];
        }

        XCTestExpectation *usable = [self expectationWithDescription:@"restored renderer executes JavaScript"];
        [webView evaluateJavaScript:@"document.body.textContent" completionHandler:^(id result, NSError *error) {
            XCTAssertNil(error);
            XCTAssertEqualObjects(result, @"native-recovery-test");
            [usable fulfill];
        }];
        [self waitForExpectations:@[usable] timeout:5];
    } @finally {
        delegate.finished = nil;
        delegate.terminated = nil;
        [recovery disconnect];
        [webView stopLoading];
        [webView removeFromSuperview];
    }
}

- (void)testAnActualForegroundTerminationReloadsTheBundledPage {
    [self checkRecoveryAfterRendererTerminationWhileActive:YES];
}

- (void)testAnActualInactiveTerminationWaitsForActivationThenRestoresThePage {
    [self checkRecoveryAfterRendererTerminationWhileActive:NO];
}
@end
