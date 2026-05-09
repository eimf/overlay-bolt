import SwiftUI

struct CanvasToolbar: View {
    @EnvironmentObject var env: AppEnvironment
    var onSave: () -> Void
    var onClear: () -> Void
    var onUndo: () -> Void

    private let palette: [String] = ["#F87171", "#4ADE80", "#60A5FA", "#FBBF24", "#E8EAED"]

    var body: some View {
        HStack(spacing: 12) {
            ForEach(CanvasTool.allCases) { tool in
                toolButton(tool: tool)
            }

            Divider()
                .frame(height: 24)
                .overlay(Color(hex: "#262B33"))

            ForEach(palette, id: \.self) { hex in
                colorSwatch(hex: hex)
            }

            Divider()
                .frame(height: 24)
                .overlay(Color(hex: "#262B33"))

            Button(action: onUndo) {
                Image(systemName: "arrow.uturn.backward")
            }
            .buttonStyle(ToolbarButtonStyle())

            Button(action: onClear) {
                Image(systemName: "trash")
            }
            .buttonStyle(ToolbarButtonStyle())

            Button(action: onSave) {
                Image(systemName: "square.and.arrow.down")
            }
            .buttonStyle(ToolbarButtonStyle(tint: Color(hex: "#4ADE80")))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(hex: "#14171C").opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color(hex: "#262B33"), lineWidth: 1)
                )
        )
    }

    private func toolButton(tool: CanvasTool) -> some View {
        let isActive = env.currentTool == tool
        return Button {
            env.currentTool = tool
        } label: {
            Image(systemName: tool.systemImage)
                .frame(width: 36, height: 36)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(isActive ? Color(hex: "#4ADE80").opacity(0.2) : Color.clear)
                )
                .foregroundColor(isActive ? Color(hex: "#4ADE80") : Color(hex: "#E8EAED"))
        }
        .buttonStyle(.plain)
    }

    private func colorSwatch(hex: String) -> some View {
        let isActive = env.currentColor.toHex() == hex.lowercased()
        return Button {
            env.currentColor = Color(hex: hex)
        } label: {
            Circle()
                .fill(Color(hex: hex))
                .frame(width: 24, height: 24)
                .overlay(
                    Circle().stroke(
                        isActive ? Color(hex: "#E8EAED") : Color.clear,
                        lineWidth: 2
                    )
                )
        }
        .buttonStyle(.plain)
    }
}

private struct ToolbarButtonStyle: ButtonStyle {
    var tint: Color = Color(hex: "#E8EAED")

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 36, height: 36)
            .foregroundColor(tint)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(configuration.isPressed ? Color(hex: "#262B33") : Color.clear)
            )
    }
}

private extension Color {
    func toHex() -> String {
        #if canImport(UIKit)
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(
            format: "#%02x%02x%02x",
            Int(round(r * 255)),
            Int(round(g * 255)),
            Int(round(b * 255))
        )
        #else
        return ""
        #endif
    }
}
