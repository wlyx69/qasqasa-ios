import UIKit
import WebKit

/// One full-screen web view that shows the bundled app (App/Resources/www) from app://local/.
final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!

    override var prefersStatusBarHidden: Bool { false }
    /// The page's top bar is forest green in light and dark mode, so the status bar text stays light.
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = AppColors.forest

        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(LocalSchemeHandler(), forURLScheme: LocalSchemeHandler.scheme)
        configuration.allowsInlineMediaPlayback = true
        let pagePreferences = WKWebpagePreferences()
        pagePreferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = pagePreferences
        // window.webkit.messageHandlers.native: lets the page know it runs inside the app (and is the bridge for saving in version 1).
        configuration.userContentController.add(NativeBridge(), name: NativeBridge.handlerName)

        let webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = AppColors.forest
        webView.scrollView.backgroundColor = AppColors.forest
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        self.webView = webView

        webView.load(URLRequest(url: LocalSchemeHandler.startURL))
    }

    // MARK: - WKNavigationDelegate

    /// Keep the app inside; hand every outside link (https://...) to Safari.
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == LocalSchemeHandler.scheme || url.scheme == "blob" || url.scheme == "data" || url.scheme == "about" {
            decisionHandler(.allow)
            return
        }
        if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    /// If the web content process is killed (e.g. memory pressure with a very large video), reload instead of showing a blank screen.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: LocalSchemeHandler.startURL))
    }

    // MARK: - WKUIDelegate

    /// target="_blank" links: open outside instead of spawning a second web view.
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }
}

/// Stage 1: receives messages from the page and ignores them. Version 1 adds saving to Photos / Files here.
final class NativeBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "native"

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Intentionally empty for now.
    }
}
