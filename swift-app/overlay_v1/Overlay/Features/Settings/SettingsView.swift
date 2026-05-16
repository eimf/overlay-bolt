import SwiftUI

struct SettingsView: View {
    @AppStorage(PreferenceKeys.persistenceEnabled, store: PreferenceKeys.store) private var persistenceEnabled: Bool = true
    @AppStorage(PreferenceKeys.gridType, store: PreferenceKeys.store) private var gridRaw: String = GridType.dots.rawValue
    @AppStorage(PreferenceKeys.canvasOpacity, store: PreferenceKeys.store) private var canvasOpacity: Double = 1.0
    @AppStorage(PreferenceKeys.pencilOnly, store: PreferenceKeys.store) private var pencilOnly: Bool = false
    @AppStorage(PreferenceKeys.canvasMode, store: PreferenceKeys.store) private var modeRaw: String = CanvasMode.fullscreen.rawValue
    @AppStorage(PreferenceKeys.overlayMode, store: PreferenceKeys.store) private var overlayModeRaw: String = OverlayMode.tabs.rawValue

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Button {
                        withAnimation {
                            overlayModeRaw = OverlayMode.quickNote.rawValue
                        }
                    } label: {
                        Label("Launch Quick Note", systemImage: "note.text")
                            .foregroundColor(Color(hex: "#4ADE80"))
                    }
                } header: {
                    Text("Quick Note")
                } footer: {
                    Text("Opens a resizable, draggable floating canvas over any app. The background is transparent so you can draw on top of anything.")
                }

                Section("Persistence") {
                    Toggle("Save sketches locally", isOn: $persistenceEnabled)
                        .tint(Color(hex: "#4ADE80"))
                }

                Section("Grid") {
                    Picker("Background", selection: $gridRaw) {
                        ForEach(GridType.allCases) { type in
                            Text(type.label).tag(type.rawValue)
                        }
                    }
                }

                Section {
                    Picker("Opacity", selection: $canvasOpacity) {
                        ForEach(OpacityStep.allCases) { step in
                            Text(step.label).tag(step.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Grid opacity")
                } footer: {
                    Text("Controls how visible the grid lines are. Does not affect drawing strokes.")
                }

                Section("Canvas mode") {
                    Picker("Mode", selection: $modeRaw) {
                        ForEach(CanvasMode.allCases, id: \.self) { mode in
                            Text(mode.rawValue.capitalized).tag(mode.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Canvas input") {
                    Toggle("Apple Pencil only", isOn: $pencilOnly)
                        .tint(Color(hex: "#4ADE80"))
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(appVersion)
                            .foregroundColor(Color(hex: "#8A94A6"))
                    }
                    Text("Overlay uses Apple PencilKit for stroke input and renders a transparent drawing surface on top of whatever you're looking at.")
                        .font(.footnote)
                        .foregroundColor(Color(hex: "#8A94A6"))
                }
            }
            .scrollContentBackground(.hidden)
            .background(Color(hex: "#0B0D10").ignoresSafeArea())
            .navigationTitle("Settings")
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}
