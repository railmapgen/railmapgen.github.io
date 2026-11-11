import Foundation
import StoreKit
import SwiftUI
import WebKit

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

private func isBundledSubscriptionURL(_ url: URL?) -> Bool {
    guard let url else { return false }
    return (url.scheme == "tauri" && url.host == "localhost") ||
        (["http", "https"].contains(url.scheme ?? "") && url.host == "tauri.localhost")
}

#if RMT_TESTFLIGHT
private let subscriptionBuildChannel = "testflight"
#else
private let subscriptionBuildChannel = "stable"
#endif

private typealias SubscriptionReply = (Any?, String?) -> Void

/// Keep StoreKit's error identity without exposing userInfo, receipts or JWS.
private func subscriptionErrorDetails(_ error: Error) -> [String: Any] {
    let native = error as NSError
    var underlying = [[String: Any]]()
    var current = native.userInfo[NSUnderlyingErrorKey] as? NSError
    var visited = Set([ObjectIdentifier(native)])
    while let nested = current, underlying.count < 4 {
        guard visited.insert(ObjectIdentifier(nested)).inserted else { break }
        underlying.append([
            "domain": nested.domain, "code": nested.code, "message": nested.localizedDescription,
        ])
        current = nested.userInfo[NSUnderlyingErrorKey] as? NSError
    }
    return [
        "domain": native.domain, "code": native.code, "message": native.localizedDescription,
        "underlying": underlying,
    ]
}

private func logSubscriptionError(_ error: Error) {
    guard let data = try? JSONSerialization.data(withJSONObject: subscriptionErrorDetails(error), options: [.sortedKeys]),
          let description = String(data: data, encoding: .utf8) else { return }
    NSLog("[RMTStoreKit] %@", description)
}

private func replySubscriptionError(_ error: Error, reply: SubscriptionReply) {
    logSubscriptionError(error)
    reply(["error": subscriptionErrorDetails(error)], nil)
}

private func replySubscriptionError(_ message: String, code: Int, reply: SubscriptionReply) {
    let error = NSError(domain: "RailMapToolkit.StoreKit", code: code,
                        userInfo: [NSLocalizedDescriptionKey: message])
    replySubscriptionError(error, reply: reply)
}

@available(iOS 16.0, macOS 13.0, *)
private func subscriptionEnvironment(_ environment: AppStore.Environment) -> String? {
    switch environment {
    case .production: return "PRODUCTION"
    case .sandbox: return "SANDBOX"
    default: return nil
    }
}

@available(iOS 17.0, macOS 14.0, *)
private func verifiedSubscriptionEnvironment(refresh: Bool = false) async throws -> String {
    let verification = refresh ? try await AppTransaction.refresh() : try await AppTransaction.shared
    guard case .verified(let transaction) = verification else {
        if case .unverified(_, let error) = verification {
            throw NSError(domain: "RailMapToolkit.StoreKit", code: 8, userInfo: [
                NSLocalizedDescriptionKey: SubscriptionError.unverifiedEnvironment.localizedDescription,
                NSUnderlyingErrorKey: error,
            ])
        }
        throw SubscriptionError.unverifiedEnvironment
    }
    guard let environment = subscriptionEnvironment(transaction.environment) else {
        throw SubscriptionError.unverifiedEnvironment
    }
    // Apple's distribution determines the real StoreKit environment. A beta
    // build must never initiate a purchase if it was installed in production.
    #if RMT_TESTFLIGHT
    guard environment == "SANDBOX" else { throw SubscriptionError.testflightEnvironment }
    #endif
    return environment
}

@available(iOS 17.0, macOS 14.0, *)
private func subscriptionConfiguration(refresh: Bool) async throws -> [String: String] {
    do {
        let environment = try await verifiedSubscriptionEnvironment(refresh: refresh)
        return ["channel": subscriptionBuildChannel, "environment": environment, "environmentSource": "appTransaction"]
    } catch {
        #if RMT_DEVELOPMENT
        // A verified production install remains invalid for a TestFlight build.
        // This Debug hint reports incomplete local StoreKit setup; purchasing
        // still requires a real, verified App Store environment and transaction.
        if !refresh {
            if let failure = error as? SubscriptionError, case .testflightEnvironment = failure { throw error }
            logSubscriptionError(error)
            return ["channel": subscriptionBuildChannel, "environment": "SANDBOX", "environmentSource": "development"]
        }
        #endif
        throw error
    }
}

/// The handler is deliberately registered in the page world, but accepts requests
/// only from the bundled top frame. Child applications use the host's existing
/// redemption entry point rather than gaining their own payment bridge.
@available(iOS 14.0, macOS 11.0, *)
@MainActor
@objc(RMTSubscriptions)
private final class RMTSubscriptions: NSObject, WKScriptMessageHandlerWithReply {
    static let shared = RMTSubscriptions()
    private let webViews = NSHashTable<WKWebView>.weakObjects()
    private var presentation: AnyObject?
    private var deliveredTransactionIDs = Set<String>()
    private var knownProductIDs = Set<String>()
    private var authorizedEnvironment: String?
    private var preparingPurchase = false
    private var updatesTask: Task<Void, Never>?

    func register(_ webView: WKWebView) {
        guard !webViews.contains(webView) else { return }
        webViews.add(webView)
        webView.configuration.userContentController.addScriptMessageHandler(
            self, contentWorld: .page, name: "rmtSubscriptions"
        )
    }

    @available(iOS 17.0, macOS 14.0, *)
    private func startTransactionUpdates() {
        guard updatesTask == nil else { return }
        // Listen only after the client has confirmed an enabled IAP backend
        // and native authorization has established the real payment environment.
        updatesTask = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self, case .verified(let transaction) = result,
                      transaction.productType == .autoRenewable,
                      self.knownProductIDs.contains(transaction.productID),
                      subscriptionEnvironment(transaction.environment) == self.authorizedEnvironment,
                      self.authorizedEnvironment != nil else { continue }
                self.publish(transaction, signed: result.jwsRepresentation)
            }
        }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard message.frameInfo.isMainFrame,
              isBundledSubscriptionURL(message.frameInfo.request.url),
              let webView = message.webView,
              isBundledSubscriptionURL(webView.url),
              let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            replySubscriptionError("Subscriptions are only available to the bundled application.", code: 1, reply: replyHandler)
            return
        }
        guard #available(iOS 17.0, macOS 14.0, *) else {
            replySubscriptionError("App Store subscriptions require iOS 17 or macOS 14 or later.", code: 2, reply: replyHandler)
            return
        }
        switch type {
        case "configuration", "refreshConfiguration":
            Task {
                do {
                    replyHandler(try await subscriptionConfiguration(refresh: type == "refreshConfiguration"), nil)
                } catch {
                    replySubscriptionError(error, reply: replyHandler)
                }
            }
        case "purchase":
            purchase(body, webView: webView, reply: replyHandler)
        case "recover":
            guard let ids = body["productIDs"] as? [String], !ids.isEmpty,
                  ids.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
                replySubscriptionError("No App Store subscription products have been configured.", code: 3, reply: replyHandler)
                return
            }
            Task {
                do {
                    let environment = try await authorizeEnvironment(body)
                    knownProductIDs.formUnion(ids)
                    startTransactionUpdates()
                    let requested = Set(ids)
                    var transactions = [String: [String: String]]()
                    for await result in StoreKit.Transaction.unfinished {
                        guard case .verified(let transaction) = result,
                              transaction.productType == .autoRenewable,
                              requested.contains(transaction.productID),
                              subscriptionEnvironment(transaction.environment) == environment else { continue }
                        transactions[String(transaction.id)] = transactionPayload(transaction, result.jwsRepresentation)
                    }
                    for await result in StoreKit.Transaction.currentEntitlements {
                        guard case .verified(let transaction) = result,
                              transaction.productType == .autoRenewable,
                              requested.contains(transaction.productID),
                              subscriptionEnvironment(transaction.environment) == environment else { continue }
                        transactions[String(transaction.id)] = transactionPayload(transaction, result.jwsRepresentation)
                    }
                    deliveredTransactionIDs.formUnion(transactions.keys)
                    replyHandler(["transactions": Array(transactions.values)], nil)
                } catch {
                    replySubscriptionError(error, reply: replyHandler)
                }
            }
        case "finish":
            guard let ids = body["transactionIDs"] as? [String], !ids.isEmpty,
                  ids.allSatisfy({ UInt64($0) != nil && deliveredTransactionIDs.contains($0) }) else {
                replySubscriptionError("Only transactions submitted for verification can be finished.", code: 4, reply: replyHandler)
                return
            }
            Task {
                let requested = Set(ids)
                for await result in StoreKit.Transaction.unfinished {
                    guard case .verified(let transaction) = result,
                          requested.contains(String(transaction.id)) else { continue }
                    await transaction.finish()
                }
                deliveredTransactionIDs.subtract(requested)
                replyHandler(["status": "finished"], nil)
            }
        default:
            replySubscriptionError("Unknown App Store subscription request.", code: 5, reply: replyHandler)
        }
    }

    @available(iOS 17.0, macOS 14.0, *)
    private func authorizeEnvironment(_ body: [String: Any], refreshOnFailure: Bool = false) async throws -> String {
        let environment: String
        do {
            environment = try await verifiedSubscriptionEnvironment()
        } catch {
            guard refreshOnFailure else { throw error }
            if let failure = error as? SubscriptionError, case .testflightEnvironment = failure { throw error }
            // Called only by the purchase button. Authentication prompts must
            // not be triggered by startup or background recovery.
            logSubscriptionError(error)
            environment = try await verifiedSubscriptionEnvironment(refresh: true)
        }
        guard let allowed = body["allowedEnvironments"] as? [String], allowed == [environment] else {
            throw SubscriptionError.environmentNotAllowed
        }
        authorizedEnvironment = environment
        return environment
    }

    @available(iOS 17.0, macOS 14.0, *)
    private func publish(_ transaction: StoreKit.Transaction, signed: String) {
        let payload = transactionPayload(transaction, signed)
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys]),
              let json = String(data: data, encoding: .utf8) else { return }
        deliveredTransactionIDs.insert(String(transaction.id))
        let script = "window.dispatchEvent(new CustomEvent('rmt-apple-transaction',{detail:\(json)}));"
        for webView in webViews.allObjects where isBundledSubscriptionURL(webView.url) {
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    @available(iOS 17.0, macOS 14.0, *)
    private func purchase(
        _ body: [String: Any], webView: WKWebView,
        reply: @escaping (Any?, String?) -> Void
    ) {
        guard presentation == nil, !preparingPurchase else {
            replySubscriptionError("The App Store subscription window is already open.", code: 6, reply: reply)
            return
        }
        let productIDs = body["productIDs"] as? [String] ?? []
        let groupID = ((body["subscriptionGroupID"] ?? body["groupID"]) as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !productIDs.isEmpty || !(groupID ?? "").isEmpty,
              productIDs.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }) else {
            replySubscriptionError("No App Store subscription products have been configured.", code: 3, reply: reply)
            return
        }
        var token: UUID?
        if let value = body["appAccountToken"] {
            guard let string = value as? String, let validToken = UUID(uuidString: string) else {
                replySubscriptionError("The App Store account token is invalid.", code: 7, reply: reply)
                return
            }
            token = validToken
        }
        preparingPurchase = true
        Task { [self] in
            defer { preparingPurchase = false }
            do {
                let environment = try await authorizeEnvironment(body, refreshOnFailure: true)
                knownProductIDs.formUnion(productIDs)
                startTransactionUpdates()
                let session = RMTSubscriptionPresentation(
                    productIDs: Array(Set(productIDs)).sorted(), groupID: groupID,
                    appAccountToken: token, language: body["language"] as? String,
                    environment: environment
                ) { [weak self] response, error in
                    if let transactions = response?["transactions"] as? [[String: String]] {
                        self?.deliveredTransactionIDs.formUnion(transactions.compactMap { $0["id"] })
                    }
                    self?.presentation = nil
                    if let error { replySubscriptionError(error, reply: reply) }
                    else { reply(response, nil) }
                }
                presentation = session
                await session.present(from: webView)
            } catch {
                replySubscriptionError(error, reply: reply)
            }
        }
    }
}

@available(iOS 17.0, macOS 14.0, *)
@MainActor
private final class RMTSubscriptionPresentation: NSObject, ObservableObject {
    let productIDs: [String]
    let groupID: String?
    let appAccountToken: UUID?
    let language: String
    let labels: SubscriptionLabels
    let environment: String
    @Published var busy = false
    @Published var errorMessage: String?
    private var response: [String: Any]?
    private var responseError: Error?
    private var completed = false
    private var closing = false
    private let completion: ([String: Any]?, Error?) -> Void
    #if os(iOS)
    private var controller: UIViewController?
    #elseif os(macOS)
    private var panel: NSPanel?
    private weak var parentWindow: NSWindow?
    #endif

    init(
        productIDs: [String], groupID: String?, appAccountToken: UUID?, language: String?, environment: String,
        completion: @escaping ([String: Any]?, Error?) -> Void
    ) {
        self.productIDs = productIDs
        self.groupID = groupID
        self.appAccountToken = appAccountToken
        let preferredLanguage = language ?? UserDefaults.standard.string(forKey: "rmtLanguage")
        self.language = SubscriptionLabels.supportedLanguage(preferredLanguage)
        self.labels = SubscriptionLabels(language: self.language)
        self.environment = environment
        self.completion = completion
    }

    func present(from webView: WKWebView) async {
        do {
            if !productIDs.isEmpty {
                let products = try await Product.products(for: productIDs)
                guard Set(products.map(\.id)) == Set(productIDs),
                      products.allSatisfy({ $0.type == .autoRenewable }),
                      Set(products.compactMap { $0.subscription?.subscriptionGroupID }).count == 1,
                      groupID == nil || groupID?.isEmpty == true ||
                        products.allSatisfy({ $0.subscription?.subscriptionGroupID == groupID }) else {
                    throw SubscriptionError.unavailableProducts
                }
            }
            #if os(iOS)
            guard var presenter = webView.window?.rootViewController else {
                throw SubscriptionError.unavailableWindow
            }
            while let presented = presenter.presentedViewController { presenter = presented }
            guard !presenter.isBeingDismissed, !presenter.isBeingPresented,
                  presenter.viewIfLoaded?.window != nil else {
                throw SubscriptionError.unavailableWindow
            }
            let host = UIHostingController(rootView: RMTSubscriptionView(session: self))
            host.modalPresentationStyle = .formSheet
            controller = host
            presenter.present(host, animated: true)
            host.presentationController?.delegate = self
            #elseif os(macOS)
            guard let window = webView.window, window.attachedSheet == nil else {
                throw SubscriptionError.unavailableWindow
            }
            let host = NSHostingController(rootView: RMTSubscriptionView(session: self))
            let sheet = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 560, height: 680),
                                styleMask: [.titled, .closable, .resizable], backing: .buffered, defer: false)
            sheet.title = "App Store"
            sheet.contentViewController = host
            sheet.minSize = NSSize(width: 420, height: 480)
            sheet.delegate = self
            panel = sheet
            parentWindow = window
            window.beginSheet(sheet) { [weak self] _ in self?.publish() }
            #endif
        } catch {
            responseError = error
            publish()
        }
    }

    func purchased(_ result: Result<Product.PurchaseResult, Error>) {
        guard !closing, !completed else { return }
        busy = false
        switch result {
        case .success(.success(let verification)):
            guard case .verified(let transaction) = verification, accepts(transaction) else {
                errorMessage = "The App Store transaction could not be verified."
                return
            }
            finish(status: "purchased", transactions: [transactionPayload(transaction, verification.jwsRepresentation)])
        case .success(.userCancelled):
            finish(status: "cancelled")
        case .success(.pending):
            finish(status: "pending")
        case .failure(let error):
            logSubscriptionError(error)
            errorMessage = error.localizedDescription
        @unknown default:
            errorMessage = "The App Store returned an unknown purchase result."
        }
    }

    func restore() async {
        guard !busy, !closing, !completed else { return }
        busy = true
        do {
            try await AppStore.sync()
            var transactions = [String: [String: String]]()
            for await result in StoreKit.Transaction.unfinished {
                guard case .verified(let transaction) = result, accepts(transaction) else { continue }
                transactions[String(transaction.id)] = transactionPayload(transaction, result.jwsRepresentation)
            }
            for await result in StoreKit.Transaction.currentEntitlements {
                guard case .verified(let transaction) = result, accepts(transaction) else { continue }
                transactions[String(transaction.id)] = transactionPayload(transaction, result.jwsRepresentation)
            }
            busy = false
            guard !transactions.isEmpty else {
                errorMessage = labels.noPurchases
                return
            }
            finish(status: "restored", transactions: Array(transactions.values))
        } catch {
            busy = false
            logSubscriptionError(error)
            errorMessage = error.localizedDescription
        }
    }

    func cancel() {
        guard !busy else { return }
        finish(status: "cancelled")
    }

    private func accepts(_ transaction: StoreKit.Transaction) -> Bool {
        transaction.productType == .autoRenewable &&
            subscriptionEnvironment(transaction.environment) == environment &&
            (productIDs.contains(transaction.productID) ||
                (productIDs.isEmpty && transaction.subscriptionGroupID == groupID))
    }

    private func finish(status: String, transactions: [[String: String]] = []) {
        guard !closing, !completed else { return }
        closing = true
        response = ["status": status, "transactions": transactions]
        #if os(iOS)
        if let controller, controller.presentingViewController != nil {
            controller.dismiss(animated: true) { [weak self] in self?.publish() }
        } else { publish() }
        #elseif os(macOS)
        if let panel, let parentWindow, panel.sheetParent != nil {
            parentWindow.endSheet(panel)
            panel.orderOut(nil)
        } else { publish() }
        #endif
    }

    fileprivate func publish() {
        guard !completed else { return }
        completed = true
        let result = response ?? (responseError == nil ? ["status": "cancelled", "transactions": []] : nil)
        completion(result, responseError)
        #if os(iOS)
        controller = nil
        #elseif os(macOS)
        panel = nil
        #endif
    }
}

@available(iOS 16.0, macOS 13.0, *)
private func transactionPayload(_ transaction: StoreKit.Transaction, _ signed: String) -> [String: String] {
    ["id": String(transaction.id), "productID": transaction.productID, "signedTransaction": signed,
     "environment": subscriptionEnvironment(transaction.environment) ?? "UNKNOWN"]
}

private struct SubscriptionLabels {
    let close: String
    let restore: String
    let ok: String
    let noPurchases: String

    static func supportedLanguage(_ value: String?) -> String {
        let preference = value == "system" ? nil : value
        let locale = Locale(identifier: preference ?? Bundle.main.preferredLocalizations.first ?? "en")
        switch locale.languageCode {
        case "zh":
            return locale.scriptCode == "Hant" || ["TW", "HK", "MO"].contains(locale.regionCode ?? "")
                ? "zh-Hant" : "zh-Hans"
        case "ja": return "ja"
        case "ko": return "ko"
        default: return "en"
        }
    }

    init(language: String) {
        switch language {
        case "zh-Hans":
            (close, restore, ok, noPurchases) = ("关闭", "恢复购买", "好", "没有可恢复的购买项目。")
        case "zh-Hant":
            (close, restore, ok, noPurchases) = ("關閉", "回復購買項目", "好", "沒有可回復的購買項目。")
        case "ja":
            (close, restore, ok, noPurchases) = ("閉じる", "購入を復元", "OK", "復元できる購入はありません。")
        case "ko":
            (close, restore, ok, noPurchases) = ("닫기", "구입 항목 복원", "확인", "복원할 구입 항목이 없습니다.")
        default:
            (close, restore, ok, noPurchases) = ("Close", "Restore Purchases", "OK", "No purchases to restore.")
        }
    }
}

@available(iOS 17.0, macOS 14.0, *)
private enum SubscriptionError: LocalizedError {
    case unavailableProducts, unavailableWindow, unverifiedEnvironment, testflightEnvironment, environmentNotAllowed
    var errorDescription: String? {
        switch self {
        case .unavailableProducts:
            return "The configured App Store subscriptions are unavailable or do not belong to one subscription group."
        case .unavailableWindow:
            return "The application window is not ready to show App Store subscriptions."
        case .unverifiedEnvironment:
            return "The App Store payment environment could not be verified."
        case .testflightEnvironment:
            return "This TestFlight build only supports Sandbox purchases. Install it through TestFlight to continue."
        case .environmentNotAllowed:
            return "The subscription server environment does not match the App Store environment."
        }
    }
}

#if os(iOS)
@available(iOS 17.0, *)
extension RMTSubscriptionPresentation: UIAdaptivePresentationControllerDelegate {
    func presentationControllerShouldDismiss(_ presentationController: UIPresentationController) -> Bool { !busy }
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) { publish() }
}
#elseif os(macOS)
@available(macOS 14.0, *)
extension RMTSubscriptionPresentation: NSWindowDelegate {
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        cancel()
        return false
    }
}
#endif

@available(iOS 17.0, macOS 14.0, *)
@MainActor
private struct RMTSubscriptionView: View {
    @ObservedObject var session: RMTSubscriptionPresentation

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button(session.labels.close) { session.cancel() }
                    .disabled(session.busy)
                Spacer()
                Button(session.labels.restore) { Task { await session.restore() } }
                    .disabled(session.busy)
            }
            .padding()
            store
                .storeButton(.hidden, for: .restorePurchases, .cancellation)
                .inAppPurchaseOptions { _ in
                    session.appAccountToken.map { [.appAccountToken($0)] } ?? []
                }
                .onInAppPurchaseStart { _ in session.busy = true }
                .onInAppPurchaseCompletion { _, result in session.purchased(result) }
        }
        .interactiveDismissDisabled(session.busy)
        .alert("App Store", isPresented: Binding(
            get: { session.errorMessage != nil },
            set: { if !$0 { session.errorMessage = nil } }
        )) {
            Button(session.labels.ok, role: .cancel) { session.errorMessage = nil }
        } message: { Text(session.errorMessage ?? "") }
        .environment(\.locale, Locale(identifier: session.language))
    }

    @ViewBuilder
    private var store: some View {
        if session.productIDs.isEmpty, let groupID = session.groupID {
            SubscriptionStoreView(groupID: groupID)
        } else {
            SubscriptionStoreView(productIDs: session.productIDs)
        }
    }
}

/// Rust calls this on the platform UI thread after receiving the live WKWebView.
@_cdecl("RMTRegisterSubscriptionsWebView")
public func RMTRegisterSubscriptionsWebView(_ pointer: UnsafeMutableRawPointer) {
    guard #available(iOS 14.0, macOS 11.0, *) else { return }
    let webView = Unmanaged<WKWebView>.fromOpaque(pointer).takeUnretainedValue()
    MainActor.assumeIsolated { RMTSubscriptions.shared.register(webView) }
}
