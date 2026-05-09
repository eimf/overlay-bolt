import Foundation

enum CanvasMode: String, Codable, CaseIterable {
    case fullscreen
    case floating
}

enum GridType: String, Codable, CaseIterable, Identifiable {
    case none
    case lines
    case squared
    case dots

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none: return "None"
        case .lines: return "Lines"
        case .squared: return "Squared"
        case .dots: return "Dots"
        }
    }
}

struct Sketch: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var drawingData: Data
    var mode: CanvasMode
    var opacity: Double
    var background: GridType
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        title: String = "Untitled",
        drawingData: Data = Data(),
        mode: CanvasMode = .fullscreen,
        opacity: Double = 1.0,
        background: GridType = .dots,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.drawingData = drawingData
        self.mode = mode
        self.opacity = opacity
        self.background = background
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
