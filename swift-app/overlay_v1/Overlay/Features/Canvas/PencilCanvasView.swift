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

        // Prevent touch-coordinate offset caused by safe-area insets
        // when embedded inside TabView or other containers.
        canvas.scrollView.contentInsetAdjustmentBehavior = .never
        canvas.scrollView.isScrollEnabled = false
        canvas.scrollView.panGestureRecognizer.minimumNumberOfTouches = 2
        canvas.scrollView.bounces = false

        return canvas
    }

    func updateUIView(_ canvas: PKCanvasView, context: Context) {
        let coordinator = context.coordinator
        // Guard against feedback loops: only push external drawing changes
        guard !coordinator.isUpdatingFromCanvas else { return }
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
        var isUpdatingFromCanvas = false

        init(_ parent: PencilCanvasView) {
            self.parent = parent
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            isUpdatingFromCanvas = true
            parent.drawing = canvasView.drawing
            isUpdatingFromCanvas = false
        }
    }
}
