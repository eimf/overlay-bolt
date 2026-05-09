import Combine
import Foundation
import PencilKit
import SwiftUI

@MainActor
final class AppEnvironment: ObservableObject {
    @Published var drawing: PKDrawing = PKDrawing()
    @Published var currentTool: CanvasTool = .pen
    @Published var currentColor: Color = Color(hex: "#F87171")
    @Published var penWidth: Double = 4
    @Published var sessions: [Sketch] = []

    private let repository = SketchRepository.shared

    func refreshSessions() {
        sessions = repository.fetchAll()
    }

    func saveCurrentDrawing(
        title: String,
        mode: CanvasMode,
        opacity: Double,
        background: GridType
    ) {
        let sketch = Sketch(
            title: title.isEmpty ? defaultTitle() : title,
            drawingData: drawing.dataRepresentation(),
            mode: mode,
            opacity: opacity,
            background: background
        )
        _ = repository.save(sketch)
        refreshSessions()
    }

    func delete(id: UUID) {
        repository.delete(id: id)
        refreshSessions()
    }

    func clearCanvas() {
        drawing = PKDrawing()
    }

    func loadSketch(_ sketch: Sketch) {
        if let loaded = try? PKDrawing(data: sketch.drawingData) {
            drawing = loaded
        }
    }

    private func defaultTitle() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, HH:mm"
        return "Sketch \(formatter.string(from: Date()))"
    }
}

enum CanvasTool: String, CaseIterable, Identifiable {
    case pen
    case highlighter
    case eraser

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pen: return "Pen"
        case .highlighter: return "Highlighter"
        case .eraser: return "Eraser"
        }
    }

    var systemImage: String {
        switch self {
        case .pen: return "pencil.tip"
        case .highlighter: return "highlighter"
        case .eraser: return "eraser"
        }
    }
}

extension Color {
    init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = Double((rgb & 0xFF0000) >> 16) / 255
        let g = Double((rgb & 0x00FF00) >> 8) / 255
        let b = Double(rgb & 0x0000FF) / 255

        self.init(red: r, green: g, blue: b)
    }
}
