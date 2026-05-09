import PencilKit
import SwiftUI
import UIKit

struct CanvasView: View {
    @EnvironmentObject var env: AppEnvironment

    @AppStorage(PreferenceKeys.canvasOpacity) private var canvasOpacity: Double = 1.0
    @AppStorage(PreferenceKeys.pencilOnly) private var pencilOnly: Bool = false
    @AppStorage(PreferenceKeys.gridType) private var gridRaw: String = GridType.dots.rawValue
    @AppStorage(PreferenceKeys.canvasMode) private var modeRaw: String = CanvasMode.fullscreen.rawValue
    @AppStorage(PreferenceKeys.persistenceEnabled) private var persistenceEnabled: Bool = true

    @State private var showSavedToast: Bool = false
    @State private var showSaveSheet: Bool = false
    @State private var saveTitle: String = ""

    private var gridType: GridType {
        GridType(rawValue: gridRaw) ?? .dots
    }

    private var canvasMode: CanvasMode {
        CanvasMode(rawValue: modeRaw) ?? .fullscreen
    }

    var body: some View {
        ZStack {
            // Fully transparent — the OS background (other apps) shows through
            Color.clear.ignoresSafeArea()

            // Grid at user-controlled opacity; drawn over the transparent background
            GridOverlayView(gridType: gridType)
                .opacity(canvasOpacity)
                .ignoresSafeArea()

            // Drawing surface — always fully opaque strokes
            PencilCanvasView(
                drawing: $env.drawing,
                tool: env.currentTool,
                color: UIColor(env.currentColor),
                width: env.penWidth,
                pencilOnly: pencilOnly
            )
            .ignoresSafeArea()

            VStack {
                Spacer()
                CanvasToolbar(
                    onSave: { showSaveSheet = true },
                    onClear: { env.clearCanvas() },
                    onUndo: undoLastStroke
                )
                .padding(.bottom, 24)
            }

            if showSavedToast {
                VStack {
                    Text("Saved")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(Color(hex: "#0B0D10"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Capsule().fill(Color(hex: "#4ADE80")))
                        .padding(.top, 24)
                    Spacer()
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .sheet(isPresented: $showSaveSheet) {
            saveSheet
                .presentationDetents([.height(240)])
        }
    }

    private var saveSheet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Save sketch")
                .font(.headline)
                .foregroundColor(Color(hex: "#E8EAED"))

            TextField("Title", text: $saveTitle)
                .textFieldStyle(.roundedBorder)

            if !persistenceEnabled {
                Text("Persistence is off. Enable it in Settings to save your work.")
                    .font(.footnote)
                    .foregroundColor(Color(hex: "#8A94A6"))
            }

            HStack {
                Button("Cancel") { showSaveSheet = false }
                    .buttonStyle(.bordered)
                Spacer()
                Button("Save") {
                    env.saveCurrentDrawing(
                        title: saveTitle,
                        mode: canvasMode,
                        opacity: canvasOpacity,
                        background: gridType
                    )
                    saveTitle = ""
                    showSaveSheet = false
                    flashSavedToast()
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(hex: "#4ADE80"))
                .disabled(!persistenceEnabled)
            }
        }
        .padding(20)
        .background(Color(hex: "#0B0D10"))
    }

    private func undoLastStroke() {
        var strokes = env.drawing.strokes
        guard !strokes.isEmpty else { return }
        strokes.removeLast()
        env.drawing = PKDrawing(strokes: strokes)
    }

    private func flashSavedToast() {
        withAnimation { showSavedToast = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            withAnimation { showSavedToast = false }
        }
    }
}
