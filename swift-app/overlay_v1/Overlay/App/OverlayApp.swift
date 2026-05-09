import SwiftUI
import UIKit

@main
struct OverlayApp: App {
    @StateObject private var env = AppEnvironment()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(env)
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Make the key window and its root view controller fully transparent
        // so only drawn strokes are visible over whatever app is behind.
        DispatchQueue.main.async {
            if let window = application.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .flatMap({ $0.windows })
                .first(where: { $0.isKeyWindow }) {
                window.backgroundColor = .clear
                window.isOpaque = false
            }
        }
        return true
    }
}
