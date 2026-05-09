import SwiftUI

struct SessionsView: View {
    @EnvironmentObject var env: AppEnvironment
    @AppStorage(PreferenceKeys.persistenceEnabled) private var persistenceEnabled: Bool = true
    var onNavigateToSettings: () -> Void = {}

    var body: some View {
        NavigationStack {
            Group {
                if !persistenceEnabled {
                    emptyState
                } else if env.sessions.isEmpty {
                    noSessionsState
                } else {
                    list
                }
            }
            .background(Color(hex: "#0B0D10").ignoresSafeArea())
            .navigationTitle("Sessions")
            .toolbarColorScheme(.dark, for: .navigationBar)
            .onAppear { env.refreshSessions() }
        }
    }

    private var list: some View {
        List {
            ForEach(env.sessions) { sketch in
                SessionRow(sketch: sketch)
                    .contentShape(Rectangle())
                    .onTapGesture { env.loadSketch(sketch) }
            }
            .onDelete { indexSet in
                for index in indexSet {
                    env.delete(id: env.sessions[index].id)
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color(hex: "#0B0D10"))
    }

    private var noSessionsState: some View {
        VStack(spacing: 12) {
            Image(systemName: "books.vertical")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "#8A94A6"))
            Text("No saved sketches yet")
                .font(.headline)
                .foregroundColor(Color(hex: "#E8EAED"))
            Text("Draw something on the Canvas tab and tap save.")
                .font(.subheadline)
                .foregroundColor(Color(hex: "#8A94A6"))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "externaldrive.badge.xmark")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "#8A94A6"))
            Text("Persistence is off")
                .font(.headline)
                .foregroundColor(Color(hex: "#E8EAED"))
            Text("Enable it in Settings to save your work.")
                .font(.subheadline)
                .foregroundColor(Color(hex: "#8A94A6"))
            Button("Go to Settings", action: onNavigateToSettings)
                .buttonStyle(.borderedProminent)
                .tint(Color(hex: "#4ADE80"))
        }
        .padding(32)
    }
}
