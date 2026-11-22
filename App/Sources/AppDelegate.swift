import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = AppColors.forest
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

enum AppColors {
    /// Brand forest #0F2A1F: top bar, launch screen and the area behind the status bar.
    static let forest = UIColor(red: 15 / 255, green: 42 / 255, blue: 31 / 255, alpha: 1)
}
