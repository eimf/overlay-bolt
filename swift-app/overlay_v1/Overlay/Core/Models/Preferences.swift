import Foundation

enum PreferenceKeys {
    static let persistenceEnabled = "persistenceEnabled"
    static let gridType = "gridType"
    static let canvasOpacity = "canvasOpacity"
    static let pencilOnly = "pencilOnly"
    static let canvasMode = "canvasMode"
    static let overlayMode = "overlayMode"
}

enum OverlayMode: String, CaseIterable {
    case tabs
    case quickNote
}

enum OpacityStep: Double, CaseIterable, Identifiable {
    case zero = 0.0
    case twenty = 0.2
    case forty = 0.4
    case sixty = 0.6
    case eighty = 0.8
    case full = 1.0

    var id: Double { rawValue }

    var label: String {
        rawValue == 0 ? "0%" : "\(Int(rawValue * 100))%"
    }
}
