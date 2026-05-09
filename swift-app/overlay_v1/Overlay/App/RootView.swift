import SwiftUI

struct RootView: View {
    @EnvironmentObject var env: AppEnvironment
    @AppStorage(PreferenceKeys.overlayMode) private var overlayModeRaw: String = OverlayMode.tabs.rawValue
    @State private var selectedTab: Int = 0

    private var overlayMode: OverlayMode {
        OverlayMode(rawValue: overlayModeRaw) ?? .tabs
    }

    var body: some View {
        ZStack {
            // True transparent background — lets whatever is behind show through
            Color.clear.ignoresSafeArea()

            switch overlayMode {
            case .tabs:
                tabsView
            case .quickNote:
                QuickNoteView()
            }
        }
        .preferredColorScheme(.dark)
        .tint(Color(hex: "#4ADE80"))
    }

    private var tabsView: some View {
        TabView(selection: $selectedTab) {
            CanvasView()
                .tabItem { Label("Canvas", systemImage: "scribble.variable") }
                .tag(0)

            SessionsView(onNavigateToSettings: { selectedTab = 2 })
                .tabItem { Label("Sessions", systemImage: "books.vertical") }
                .tag(1)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(2)
        }
    }
}
