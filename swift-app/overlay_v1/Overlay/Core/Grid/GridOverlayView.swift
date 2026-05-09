import SwiftUI

struct GridOverlayView: View {
    let gridType: GridType
    private let spacing: CGFloat = 28
    private let lineOpacity: Double = 0.18

    var body: some View {
        Canvas { context, size in
            guard gridType != .none else { return }
            let color = Color.white.opacity(lineOpacity)

            switch gridType {
            case .none:
                break
            case .lines:
                drawHorizontalLines(context: context, size: size, color: color)
            case .squared:
                drawSquares(context: context, size: size, color: color)
            case .dots:
                drawDots(context: context, size: size, color: color)
            }
        }
        .allowsHitTesting(false)
    }

    private func drawHorizontalLines(context: GraphicsContext, size: CGSize, color: Color) {
        var y: CGFloat = spacing
        while y < size.height {
            var path = Path()
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: size.width, y: y))
            context.stroke(path, with: .color(color), lineWidth: 0.5)
            y += spacing
        }
    }

    private func drawSquares(context: GraphicsContext, size: CGSize, color: Color) {
        var x: CGFloat = spacing
        while x < size.width {
            var path = Path()
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: size.height))
            context.stroke(path, with: .color(color), lineWidth: 0.5)
            x += spacing
        }
        var y: CGFloat = spacing
        while y < size.height {
            var path = Path()
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: size.width, y: y))
            context.stroke(path, with: .color(color), lineWidth: 0.5)
            y += spacing
        }
    }

    private func drawDots(context: GraphicsContext, size: CGSize, color: Color) {
        let radius: CGFloat = 1
        var y: CGFloat = spacing
        while y < size.height {
            var x: CGFloat = spacing
            while x < size.width {
                let rect = CGRect(
                    x: x - radius,
                    y: y - radius,
                    width: radius * 2,
                    height: radius * 2
                )
                context.fill(Path(ellipseIn: rect), with: .color(color))
                x += spacing
            }
            y += spacing
        }
    }
}
