# Xcode Build Prompt — Overlay (iOS / iPadOS)

Paste everything below this line into ChatGPT (or any AI chat).
The prompt is self-contained: no extra context files are needed.

---

## Prompt

I want you to build a complete, production-ready iOS / iPadOS app in Swift using
SwiftUI and PencilKit. The app is called **Overlay**. Generate all files in the
correct dependency order so the project compiles cleanly in Xcode from the start.

---

### What the app does

Overlay is a **transparent drawing overlay**. The user draws on top of
whatever they are looking at — a lesson, a video, a document in another window —
without the app imposing its own background. The canvas is always see-through;
nothing forces a background color or image.

---

### Target platforms

- iOS 17+ / iPadOS 17+
- Swift 5.9
- SwiftUI + PencilKit
- Swift Package Manager for dependencies
- Local persistence only — no remote backend or third-party SDK required

---

### Starting point (default Xcode template)

The Xcode project has just been created from the iOS App template, so the
current layout is:

```
Overlay/                          (Xcode project root)
  Overlay/                        (app target source folder — add files here)
    Assets.xcassets
    ContentView.swift             DELETE — replaced by CanvasView
    Info.plist
    Item.swift                    DELETE — leftover from template
    Overlay.entitlements
    OverlayApp.swift              REPLACE contents (see file 14 below)
  OverlayTests/
    OverlayTests.swift            (leave as-is)
  OverlayUITests/
    OverlayUITests.swift          (leave as-is)
    OverlayUITestsLaunchTests.swift
```

**First, in Xcode:**

1. Right-click `ContentView.swift` → Delete → Move to Trash.
2. Right-click `Item.swift` → Delete → Move to Trash.
3. Select the inner `Overlay` folder (the yellow one with the app icon), then
   right-click → **New Group** and create the following groups so files are
   organized on disk and in the navigator:
   - `App`
   - `Features` → with subgroups `Canvas`, `Sessions`, `Settings`
   - `Core` → with subgroups `Persistence`, `Grid`, `Models`

When creating each group, use **New Group** (not "New Group without Folder") so
Xcode creates a matching folder on disk.

### Target project structure (after adding all files)

```
Overlay/                          (Xcode project root)
  Overlay/                        (app target source folder)
    Assets.xcassets
    Info.plist
    Overlay.entitlements
    App/
      OverlayApp.swift            @main entry point (REPLACE the existing one)
      AppEnvironment.swift        ObservableObject holding shared state
    Features/
      Canvas/
        CanvasView.swift          Main drawing screen
        PencilCanvasView.swift    UIViewRepresentable wrapping PKCanvasView
        CanvasToolbar.swift       Pen / highlighter / eraser / undo / clear / save
      Sessions/
        SessionsView.swift        List of locally saved sketches
        SessionRow.swift          Single row with stroke thumbnail
      Settings/
        SettingsView.swift        Persistence toggle + grid picker + opacity stepper
    Core/
      Persistence/
        SketchStore.swift         Local save / load / delete (JSON in Documents)
        SketchRepository.swift    save() / fetchAll() / delete() — no-ops when off
      Grid/
        GridOverlayView.swift     SwiftUI Canvas drawing lines / squares / dots
      Models/
        Sketch.swift              Codable struct
        Stroke.swift              Codable struct
        Preferences.swift         @AppStorage-backed struct
```

When adding each file via **File > New > File… > Swift File**, make sure:

- The file's **Group** matches the folder it belongs to (e.g. `Core/Models`).
- The **Target** checkbox for `Overlay` is ticked.
- The save location (the grey path at the bottom of the dialog) points at the
  matching folder on disk.

---

### Data model (suggestion — adjust as needed to fit the implementation)

The structs below are a starting point. Feel free to add, remove, or rename
fields to best suit the local persistence strategy and PencilKit integration.
Use `PKDrawing` serialization where it makes sense instead of hand-rolling
stroke point arrays.

```swift
struct Sketch: Identifiable, Codable {
    let id: UUID
    var title: String
    var drawingData: Data      // PKDrawing.dataRepresentation()
    var mode: CanvasMode       // "fullscreen" | "floating"
    var opacity: Double
    var background: GridType   // "none" | "lines" | "squared" | "dots"
    var createdAt: Date
    var updatedAt: Date
}

struct Stroke: Codable {
    var color: String          // hex e.g. "#F87171"
    var width: Double
    var tool: StrokeTool       // "pen" | "highlighter"
    var points: [CGPoint]
}

enum CanvasMode: String, Codable { case fullscreen, floating }
enum StrokeTool: String, Codable { case pen, highlighter }
enum GridType: String, Codable, CaseIterable {
    case none, lines, squared, dots
}
```

---

### Persistence on/off rule (critical)

The user can enable or disable local save. This preference is stored in
`@AppStorage("persistenceEnabled")`.

**When `persistenceEnabled == false`:**
- `SketchRepository.save()` returns silently — nothing is written to disk.
- `SketchRepository.fetchAll()` returns an empty array.
- The Sessions tab shows: *"Persistence is off. Enable it in Settings to save
  your work."*

**When `persistenceEnabled == true`:**
- Sketches are saved to the app's Documents directory as JSON files.
- All CRUD operations go through `SketchRepository` → `SketchStore`.

---

### Canvas behavior

Use `PKCanvasView` wrapped in `UIViewRepresentable` for the drawing surface.

- Set `canvasView.backgroundColor = .clear` — the canvas must be transparent.
- Set `canvasView.isOpaque = false`.
- The root `CanvasView` background is also `.clear` / transparent.
- Support Apple Pencil (primary input). Optionally allow finger drawing via a
  toggle stored in `@AppStorage("pencilOnly")`.
- Tool mapping:
  - **Pen** → `PKInkingTool(.pen, color:, width:)`
  - **Highlighter** → `PKInkingTool(.marker, color: color.withAlphaComponent(0.35), width: width * 3)`
  - **Eraser** → `PKEraserTool(.vector)`

---

### Grid overlay

`GridOverlayView` is a SwiftUI `Canvas` drawn behind the PKCanvasView.

```swift
// Pseudocode — implement with SwiftUI Canvas
func draw(context: GraphicsContext, size: CGSize) {
    switch gridType {
    case .lines:   // draw horizontal lines every 28pt
    case .squared: // draw 28pt grid squares
    case .dots:    // draw dots every 28pt
    case .none:    break
    }
}
```

Stroke color: white, opacity: 0.18, spacing: 28pt.

---

### Opacity control

A `Double` value in `[0.2, 0.4, 0.6, 0.8, 1.0]` stored in
`@AppStorage("canvasOpacity")`.

Apply it as `.opacity(preferences.canvasOpacity)` on the `PKCanvasView` wrapper.

The grid overlay is NOT affected by this opacity — it always draws at 0.18.

---

### Settings screen

Sections:

1. **Persistence** — `Toggle` bound to `@AppStorage("persistenceEnabled")`.
2. **Grid** — `Picker` with four cases from `GridType`.
3. **Opacity** — `Picker` (segmented style) with five steps: 20 / 40 / 60 / 80 / 100%.
4. **Canvas input** — `Toggle` for pencil-only mode.
5. **About** — App version, PencilKit note.

---

### Sessions screen

- Fetches from `SketchRepository.fetchAll()` on appear.
- Shows a `List` of `SessionRow` items.
- Each row: sketch title, date, mode badge, a `PKDrawing`-rendered thumbnail.
- Swipe to delete calls `SketchRepository.delete(id:)`.
- If persistence is off, show a full-screen empty state with a "Go to Settings"
  button that navigates to `SettingsView`.

---

### Visual language

- Dark color scheme only (`preferredColorScheme(.dark)`).
- Accent color: `#4ADE80` (green). Never use purple or indigo.
- Background of all non-canvas views: `#0B0D10`.
- Surface cards: `#14171C` with border `#262B33`.
- Text primary: `#E8EAED`, text secondary: `#8A94A6`.
- Spacing unit: 8pt multiples.
- Corner radius: small 8pt, medium 12pt, large 16pt, pill 999pt.

---

### Navigation

Use `TabView` with three tabs:

| Tab | Icon (SF Symbol) | Screen |
|-----|-----------------|--------|
| Canvas | `scribble.variable` | `CanvasView` |
| Sessions | `books.vertical` | `SessionsView` |
| Settings | `gearshape` | `SettingsView` |

---

### Floating overlay mode

When the user switches to **floating** mode:

- Present `CanvasView` in a resizable, draggable `UIWindowScene` overlay (use
  `UIWindow` with `windowLevel = .statusBar + 1` on iPad, or a sheet on iPhone).
- The floating window should default to 480×360pt, positioned in the top-right.
- The window's background must remain fully transparent.

---

### File generation order

Generate all files in this order so dependencies are satisfied. Each path below
is **relative to the app target folder** (`Overlay/Overlay/`):

1. `Core/Models/Stroke.swift`
2. `Core/Models/Sketch.swift`
3. `Core/Models/Preferences.swift`
4. `Core/Persistence/SketchStore.swift`
5. `Core/Persistence/SketchRepository.swift`
6. `Core/Grid/GridOverlayView.swift`
7. `App/AppEnvironment.swift`
8. `Features/Canvas/PencilCanvasView.swift`
9. `Features/Canvas/CanvasToolbar.swift`
10. `Features/Canvas/CanvasView.swift`
11. `Features/Sessions/SessionRow.swift`
12. `Features/Sessions/SessionsView.swift`
13. `Features/Settings/SettingsView.swift`
14. `App/OverlayApp.swift` (replace contents of the existing template file)

Output all 14 files in a single response. For each file, show the full path
relative to `Overlay/Overlay/` so I know exactly where to put it, followed by
the complete Swift source in a code block.

---

### What NOT to do

- Do not add any photo background
  screenshot as a canvas backdrop. The canvas is always sedu-transparent.
- Do not use any remote backend, cloud service, or third-party SDK.
- Do not use purple, indigo, or violet anywhere in the UI.
- Do not use Combine or UIKit navigation directly — use SwiftUI and
  `@AppStorage` / `@EnvironmentObject`.

---

Output all 14 files now, in the order listed above, so the project can be opened and built in Xcode immediately.
