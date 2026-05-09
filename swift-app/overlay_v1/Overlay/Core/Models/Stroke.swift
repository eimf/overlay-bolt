import CoreGraphics
import Foundation

enum StrokeTool: String, Codable {
    case pen
    case highlighter
}

struct Stroke: Codable, Equatable {
    var color: String
    var width: Double
    var tool: StrokeTool
    var points: [CGPoint]
}
