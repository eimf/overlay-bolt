import PencilKit
import SwiftUI

// Minimum and maximum panel dimensions
private let minSize = CGSize(width: 240, height: 200)
private let maxSize = CGSize(width: 900, height: 900)
private let defaultSize = CGSize(width: 420, height: 340)

struct QuickNoteView: View {
    @EnvironmentObject var env: AppEnvironment
    @AppStorage(PreferenceKeys.overlayMode) private var overlayModeRaw: String = OverlayMode.quickNote.rawValue
    @AppStorage(PreferenceKeys.pencilOnly) private var pencilOnly: Bool = false
    @AppStorage(PreferenceKeys.gridType) private var gridRaw: String = GridType.dots.rawValue
    @AppStorage(PreferenceKeys.canvasOpacity) private var canvasOpacity: Double = 1.0

    // Panel position & size
    @State private var panelPosition: CGPoint = .zero
    @State private var panelSize: CGSize = defaultSize
    @State private var isDragging: Bool = false
    @State private var isResizing: Bool = false

    // Drag state
    @State private var dragOffset: CGSize = .zero
    @State private var resizeDelta: CGSize = .zero

    @State private var isMinimized: Bool = false
    @State private var showColorPicker: Bool = false

    private let palette: [String] = ["#F87171", "#4ADE80", "#60A5FA", "#FBBF24", "#E8EAED"]

    private var gridType: GridType { GridType(rawValue: gridRaw) ?? .dots }

    var body: some View {
        GeometryReader { geo in
            let safeSize = geo.size
            ZStack {
                Color.clear.ignoresSafeArea()

                panel(in: safeSize)
                    .position(clampedPosition(in: safeSize))
            }
            .onAppear {
                if panelPosition == .zero {
                    panelPosition = CGPoint(
                        x: safeSize.width / 2,
                        y: safeSize.height / 2
                    )
                }
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func panel(in containerSize: CGSize) -> some View {
        let currentSize = currentPanelSize()

        ZStack(alignment: .topLeading) {
            // Panel background — slightly frosted, not fully opaque
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(hex: "#0B0D10").opacity(0.55))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )

            VStack(spacing: 0) {
                titleBar(containerSize: containerSize)

                if !isMinimized {
                    canvasArea(size: currentSize)
                    miniToolbar()
                        .padding(.horizontal, 10)
                        .padding(.bottom, 10)
                        .padding(.top, 6)
                }
            }

            // Resize handle — bottom-right corner
            if !isMinimized {
                resizeHandle(containerSize: containerSize)
            }
        }
        .frame(
            width: currentSize.width,
            height: isMinimized ? 44 : currentSize.height
        )
        .shadow(color: .black.opacity(0.4), radius: 24, x: 0, y: 8)
    }

    private func titleBar(containerSize: CGSize) -> some View {
        HStack(spacing: 8) {
            // Drag handle icon
            Image(systemName: "line.3.horizontal")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color(hex: "#8A94A6"))

            Text("Quick Note")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Color(hex: "#E8EAED"))

            Spacer()

            // Minimize / expand
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                    isMinimized.toggle()
                }
            } label: {
                Image(systemName: isMinimized ? "chevron.down" : "chevron.up")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "#8A94A6"))
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 7))
            }
            .buttonStyle(.plain)

            // Back to full app
            Button {
                withAnimation {
                    overlayModeRaw = OverlayMode.tabs.rawValue
                }
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "#8A94A6"))
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 7))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .frame(height: 44)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 2)
                .onChanged { value in
                    isDragging = true
                    panelPosition = CGPoint(
                        x: panelPosition.x + value.translation.width - dragOffset.width,
                        y: panelPosition.y + value.translation.height - dragOffset.height
                    )
                    dragOffset = value.translation
                }
                .onEnded { _ in
                    isDragging = false
                    dragOffset = .zero
                }
        )
    }

    private func canvasArea(size: CGSize) -> some View {
        ZStack {
            // Transparent drawing surface
            Color.clear

            GridOverlayView(gridType: gridType)
                .opacity(canvasOpacity)

            PencilCanvasView(
                drawing: $env.drawing,
                tool: env.currentTool,
                color: UIColor(env.currentColor),
                width: env.penWidth,
                pencilOnly: pencilOnly
            )
        }
        .frame(height: size.height - 44 - miniToolbarHeight)
        .clipShape(Rectangle())
    }

    private var miniToolbarHeight: CGFloat { 52 }

    private func miniToolbar() -> some View {
        HStack(spacing: 8) {
            // Tools
            ForEach(CanvasTool.allCases) { tool in
                Button {
                    env.currentTool = tool
                } label: {
                    let active = env.currentTool == tool
                    Image(systemName: tool.systemImage)
                        .font(.system(size: 14))
                        .frame(width: 32, height: 32)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(active ? Color(hex: "#4ADE80").opacity(0.2) : Color.white.opacity(0.06))
                        )
                        .foregroundColor(active ? Color(hex: "#4ADE80") : Color(hex: "#E8EAED"))
                }
                .buttonStyle(.plain)
            }

            Divider()
                .frame(height: 20)
                .overlay(Color.white.opacity(0.15))

            // Color swatches
            ForEach(palette, id: \.self) { hex in
                let active = env.currentColor.toHex() == hex.lowercased()
                Button { env.currentColor = Color(hex: hex) } label: {
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(width: 20, height: 20)
                        .overlay(Circle().stroke(active ? Color.white : Color.clear, lineWidth: 2))
                }
                .buttonStyle(.plain)
            }

            Spacer()

            // Undo
            Button { undoLastStroke() } label: {
                Image(systemName: "arrow.uturn.backward")
                    .font(.system(size: 13))
                    .frame(width: 32, height: 32)
                    .foregroundColor(Color(hex: "#E8EAED"))
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)

            // Clear
            Button { env.clearCanvas() } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13))
                    .frame(width: 32, height: 32)
                    .foregroundColor(Color(hex: "#F87171"))
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
    }

    private func resizeHandle(containerSize: CGSize) -> some View {
        let size = currentPanelSize()
        return Image(systemName: "arrow.up.left.and.arrow.down.right")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(Color(hex: "#8A94A6"))
            .frame(width: 28, height: 28)
            .background(Color(hex: "#1A1F26").opacity(0.9), in: RoundedRectangle(cornerRadius: 6))
            .offset(
                x: size.width - 32,
                y: (isMinimized ? 44 : size.height) - 32
            )
            .gesture(
                DragGesture(minimumDistance: 2)
                    .onChanged { value in
                        isResizing = true
                        let newW = max(minSize.width, min(maxSize.width,
                            panelSize.width + value.translation.width - resizeDelta.width))
                        let newH = max(minSize.height, min(maxSize.height,
                            panelSize.height + value.translation.height - resizeDelta.height))
                        panelSize = CGSize(width: newW, height: newH)
                        resizeDelta = value.translation
                    }
                    .onEnded { _ in
                        isResizing = false
                        resizeDelta = .zero
                    }
            )
    }

    // Clamp panel so it never goes fully off-screen
    private func clampedPosition(in size: CGSize) -> CGPoint {
        let pw = currentPanelSize().width
        let ph = isMinimized ? 44.0 : currentPanelSize().height
        let margin: CGFloat = 40
        let x = min(max(panelPosition.x, pw / 2 - pw + margin), size.width - pw / 2 + pw - margin)
        let y = min(max(panelPosition.y, ph / 2 - ph + margin), size.height - ph / 2 + ph - margin)
        return CGPoint(x: x, y: y)
    }

    private func currentPanelSize() -> CGSize { panelSize }

    private func undoLastStroke() {
        var strokes = env.drawing.strokes
        guard !strokes.isEmpty else { return }
        strokes.removeLast()
        env.drawing = PKDrawing(strokes: strokes)
    }
}

private extension Color {
    func toHex() -> String {
        #if canImport(UIKit)
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02x%02x%02x", Int(round(r * 255)), Int(round(g * 255)), Int(round(b * 255)))
        #else
        return ""
        #endif
    }
}
