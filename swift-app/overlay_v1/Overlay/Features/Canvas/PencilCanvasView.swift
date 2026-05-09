import PencilKit
import SwiftUI
import UIKit

struct PencilCanvasView: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    var tool: CanvasTool
    var color: UIColor
    var width: Double
    var pencilOnly: Bool

    func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.drawingPolicy = pencilOnly ? .pencilOnly : .anyInput
        canvas.drawing = drawing
        canvas.delegate = context.coordinator
        canvas.tool = makeTool()
        return canvas
    }

    func updateUIView(_ canvas: PKCanvasView, context: Context) {
        if canvas.drawing != drawing {
            canvas.drawing = drawing
        }
        canvas.drawingPolicy = pencilOnly ? .pencilOnly : .anyInput
        canvas.tool = makeTool()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private func makeTool() -> PKTool {
        switch tool {
        case .pen:
            return PKInkingTool(.pen, color: color, width: CGFloat(width))
        case .highlighter:
            let highlighterColor = color.withAlphaComponent(0.35)
            return PKInkingTool(.marker, color: highlighterColor, width: CGFloat(width * 3))
        case .eraser:
            return PKEraserTool(.bitmap)
        }
    }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        private let parent: PencilCanvasView

        init(_ parent: PencilCanvasView) {
            self.parent = parent
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            DispatchQueue.main.async {
                self.parent.drawing = canvasView.drawing
            }
        }
    }
}
