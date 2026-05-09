import PencilKit
import SwiftUI
import UIKit

struct SessionRow: View {
    let sketch: Sketch

    var body: some View {
        HStack(spacing: 12) {
            thumbnail
                .frame(width: 72, height: 54)
                .background(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color(hex: "#0B0D10"))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color(hex: "#262B33"), lineWidth: 1)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(sketch.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(Color(hex: "#E8EAED"))
                    .lineLimit(1)
                Text(sketch.updatedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(Color(hex: "#8A94A6"))
            }

            Spacer()

            Text(sketch.mode.rawValue.capitalized)
                .font(.caption2.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(
                    Capsule().fill(Color(hex: "#262B33"))
                )
                .foregroundColor(Color(hex: "#E8EAED"))
        }
        .padding(.vertical, 8)
        .listRowBackground(Color(hex: "#14171C"))
    }

    private var thumbnail: some View {
        Group {
            if let drawing = try? PKDrawing(data: sketch.drawingData),
               !drawing.bounds.isEmpty {
                Image(uiImage: render(drawing: drawing))
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else {
                Image(systemName: "scribble")
                    .foregroundColor(Color(hex: "#8A94A6"))
            }
        }
    }

    private func render(drawing: PKDrawing) -> UIImage {
        let targetSize = CGSize(width: 72, height: 54)
        let bounds = drawing.bounds
        guard bounds.width > 0, bounds.height > 0 else {
            return UIImage()
        }
        let scale = min(targetSize.width / bounds.width, targetSize.height / bounds.height)
        return drawing.image(from: bounds, scale: max(scale, 0.1))
    }
}
