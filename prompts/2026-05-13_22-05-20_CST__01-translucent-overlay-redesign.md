# Overlay — Translucent Redesign + Performance Pass

**Version:** 01
**Created:** 2026-05-13 22:05:20 CST
**Scope:** `swift-app/overlay_v1/Overlay/` (SwiftUI / PencilKit, **iPadOS only**)
**Target platform:** iPad exclusively. Do **not** support iPhone, Mac Catalyst, visionOS, or any other family. The app is iPad-only by product decision.
**Intent:** Strip the app down to a single translucent canvas surface. Remove the tabbed shell, the Quick Note mode, and the Settings screen. Replace them with two minimal, always-visible edge controls (opacity + grid) and a corner Sessions affordance. While editing, audit the codebase for dead code, redundant state, and rendering hot paths — fix what you find.

---

## 1. Product direction (read this first, do not skip)

The app is a translucent sketch surface for **iPad only**. The user runs it in a normal iPadOS window (Split View, Slide Over, Stage Manager, or full-screen) and draws on top of whatever is visible behind. The OS already provides windowing, resizing, and movement — **the app must not reimplement any of it.**

### 1.1 iPad-only enforcement
- `app.json` / Xcode target: `Targeted Device Family` = iPad only (`UIDeviceFamily = [2]`). Remove `1` (iPhone) and any `7` (visionOS) entries.
- `supportsTablet: true`, plus `"ios": { "supportsTablet": true }` and explicitly **no** iPhone support flag.
- Disable Mac Catalyst (`UISupportsMacCatalyst = NO` if present).
- `UISupportedInterfaceOrientations~ipad`: all four orientations supported. Do not declare phone-only orientation keys.
- Minimum deployment target: iPadOS 17.0 (we rely on modern PencilKit + SwiftUI behavior — do not lower it).
- Layout assumptions in code may assume an iPad-class regular size class. You do **not** need compact-width fallbacks. If a `horizontalSizeClass` check exists for phone behavior, delete that branch.
- Do not add iPhone preview providers, iPhone screenshots, or any compact-layout adaptations.

That means: no "fullscreen vs floating" mode, no draggable internal panel, no quick-note popover, no in-app window chrome. There is exactly one surface: the canvas, edge to edge. Controls live on the edges of that surface and stay out of the way.

Translucency is the product. The canvas background is fully clear; only strokes and a faint grid are visible. The user controls how visible the grid is via a discrete opacity slider on the edge of the screen.

---

## 2. What to remove (be aggressive — delete, do not comment out)

Delete every file, type, key, and call site below. If a removal leaves an unused import, helper, or `@AppStorage` key, remove that too.

### 2.1 Files to delete entirely
- `App/RootView.swift` — replaced by a direct root in `OverlayApp.swift`
- `Features/QuickNote/QuickNoteView.swift` (and the `QuickNote/` folder if empty)
- `Features/Settings/SettingsView.swift` (and the `Settings/` folder if empty)
- `Features/Canvas/CanvasToolbar.swift` — its actions move to the corner Sessions menu / edge controls

### 2.2 Symbols / preferences to delete
- `OverlayMode` enum and `PreferenceKeys.overlayMode`
- `CanvasMode` enum and `PreferenceKeys.canvasMode` (the "fullscreen vs floating" concept is gone)
- `PreferenceKeys.persistenceEnabled` and the user-facing toggle — persistence is always on (Sessions is the only way to manage saved work)
- `PreferenceKeys.pencilOnly` and the toggle — Apple Pencil is always allowed; finger input stays enabled (do not surface a setting)
- `OpacityStep` enum if it exists — replaced by a discrete `Int` step (see §3.2)
- Any save-sheet UI inside `CanvasView` that depended on the toolbar — replaced by the Sessions menu's "Save" action

### 2.3 Top-bar / tab shell
- All `TabView`, `tabItem`, `selectedTab` state in the root.
- The system status bar / nav bar treatment from any removed parent — the canvas extends under safe areas (`ignoresSafeArea()` on the canvas; edge controls respect safe area insets so they remain tappable).

After this pass, a `grep -r "OverlayMode\|CanvasMode\|QuickNote\|persistenceEnabled\|pencilOnly\|CanvasToolbar"` over `swift-app/` must return zero hits.

---

## 3. What to build

### 3.1 New root
`OverlayApp.swift` presents `CanvasView()` directly inside the `WindowGroup`. Keep the existing `AppDelegate` transparency hack (clear `UIWindow` background). No tabs, no NavigationStack, no preferred color scheme overrides at the root — set color scheme on the canvas if needed.

### 3.2 Opacity slider (right edge, vertical, discrete)
- Anchored to the **right edge**, vertically centered, respecting safe-area insets.
- Discrete steps: `0, 10, 25, 50, 75, 100` (percent). Store as `Int` under `PreferenceKeys.gridOpacityStep`.
- Visual: a slim vertical track (~6pt wide, ~180pt tall), with a thumb that snaps to the nearest step. Use haptic `selection` feedback on each step change via `UISelectionFeedbackGenerator`. Recent iPads support haptics; older iPads no-op silently — do not branch on device.
- The slider itself is translucent: `.background(.ultraThinMaterial)` capsule, ~40% alpha, so it does not dominate the screen.
- Controls **only the grid opacity**. Strokes are always 100% opaque — never fade them.
- At step `0`, the grid is hidden entirely (skip rendering — see §5.1).

### 3.3 Grid type buttons (right edge, beside the slider)
- Three small icon buttons stacked vertically just above or below the opacity slider: `Dots`, `Lines`, `Squared`.
- Use SF Symbols: `circle.grid.2x2`, `line.3.horizontal`, `square.grid.3x3` (pick the closest available; do not invent symbol names).
- ~28×28pt tap targets, same translucent material treatment as the slider.
- Selected state: tinted with the app accent (`#4ADE80`) at 80%. Unselected: `.secondary` at 60%.
- A fourth state is implied by opacity step `0` — when the grid is off, dim all three buttons to 30% to signal "no grid visible right now". Do not add a separate "off" button.

### 3.4 Sessions corner button (top-trailing or bottom-trailing — pick top-trailing)
- A single circular icon button (~36pt) in the top-trailing corner of the canvas, inside safe area.
- Icon: `books.vertical` (SF Symbol).
- Tap opens a **sheet** (`.sheet(isPresented:)`, `.presentationDetents([.medium, .large])`) containing the existing `SessionsView`, plus a "New" and "Save current" action at the top of the sheet.
- The sheet replaces the deleted Save sheet from `CanvasView`. Saving prompts for a title inline (single `TextField` + Save button, no separate modal stack).
- Translucent, same material treatment as the edge controls.

### 3.5 No other on-canvas chrome
No top bar, no bottom toolbar, no floating panel, no menu. The four interactive things on screen are: the canvas itself, the opacity slider, the three grid buttons, and the Sessions corner button. That's it.

---

## 4. Layout contract

```
+----------------------------------------------------+
|                                          [Sess]   |  <- top-trailing, ~16pt inset
|                                                    |
|                                              [Dot] |  <- grid buttons,
|                                              [Lin] |     vertically stacked,
|                                              [Sqr] |     ~12pt right inset
|                                                    |
|                                              | |  |  <- vertical opacity slider,
|                                              | |  |     ~12pt right inset,
|                                              | |  |     centered with grid buttons
|                                              | |  |
|                                                    |
|                                                    |
+----------------------------------------------------+
```

The slider sits below the grid buttons, both flush to the right edge. Total right-edge column width ~44pt. The Sessions button is the only top-edge element. The left, bottom, and most of the top remain clear so drawing space is maximized.

Use a single `ZStack` with the canvas as the bottom layer and an overlay container that uses `.safeAreaInset(edge: .trailing)` or absolute alignment via `.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)` — pick the approach that does not block touches on the canvas in unused regions.

---

## 5. Performance + cleanup pass (do this in the same change)

Walk every file under `swift-app/overlay_v1/Overlay/` and apply the following. Report what you changed at the end of the work.

### 5.1 Rendering
- **Skip the grid entirely when opacity step is 0.** Do not render `GridOverlayView` with `opacity(0)` — return `EmptyView()` so SwiftUI does not invoke the `Canvas` draw closure at all.
- **Cache grid drawing.** `GridOverlayView` currently redraws on every state change. Wrap its `Canvas` in `.drawingGroup()` only if profiling shows it helps; otherwise ensure its inputs (`gridType`, `size`) are the only things that invalidate it. Move the `Color`/`CGFloat` constants out of the body so they are not reallocated per redraw.
- **Do not animate opacity changes on the grid.** Discrete steps should snap. Wrap the opacity application in `.transaction { $0.animation = nil }` or use `.animation(nil, value: gridOpacityStep)`.
- **PencilKit canvas:** ensure `PKCanvasView` is created once. If `PencilCanvasView` rebuilds the `PKCanvasView` on every prop change, fix `updateUIView` to mutate properties on the existing instance instead of replacing it. Verify `drawingPolicy` is set once.

### 5.2 State
- Collapse `@AppStorage` keys to the minimum: `gridOpacityStep` (Int), `gridType` (String). Nothing else should be persisted in `UserDefaults` after this change.
- `AppEnvironment` should expose only what the canvas + sessions actually consume. Remove any properties that were only referenced by deleted files.
- Remove `@State` toasts that duplicate sheet feedback. The save sheet dismissal is itself the success signal — drop the "Saved" toast unless it is genuinely useful (lean toward removing it).

### 5.3 Memory / lifecycle
- Confirm `SketchRepository` is instantiated once (singleton or injected via `AppEnvironment`), not per-view.
- Ensure `SketchStore` does not hold the entire drawing data of every session in memory — list views should load metadata only and lazy-load `PKDrawing` data when a row is opened. If the current implementation eagerly decodes all drawings, refactor to defer.
- Audit `Stroke.swift` — if it duplicates what `PKDrawing` already serializes, delete it and use PencilKit's native data round-trip (`PKDrawing(data:)` / `drawing.dataRepresentation()`).

### 5.4 Code hygiene
- Remove every unused `import`.
- Remove every `// MARK:` section that no longer has content under it.
- Inline any helper that is called from exactly one place and is under 5 lines.
- Replace any `DispatchQueue.main.async` with `Task { @MainActor in ... }` where the surrounding context is async-friendly.
- Replace `DispatchQueue.main.asyncAfter` toasts with `.task` + `try? await Task.sleep` when kept.

### 5.5 Build verification
- The project must compile with zero warnings after the pass. Treat warnings as failures.
- No new dependencies. No SPM changes.

---

## 6. Persistence

Keep persistence local-first via `SketchRepository` / `SketchStore` exactly as today. Supabase is available in the wider repo but is **not** part of this prompt — do not wire it up. (A later prompt will handle cloud sync.)

The `Sketch` model loses fields that no longer apply: drop `mode` (CanvasMode is gone), keep `opacity` and `background` (still meaningful per-session), keep `id`, `title`, `drawingData`, `createdAt`, `updatedAt`. Migrate existing stored sketches by ignoring missing `mode` on decode — provide a default value in `init(from:)` rather than failing.

---

## 7. Files you will touch

Expected diff surface (use this as a checklist; deviate only with reason):

| File | Action |
|---|---|
| `App/OverlayApp.swift` | Edit — render `CanvasView` directly |
| `App/RootView.swift` | **Delete** |
| `App/AppEnvironment.swift` | Edit — drop unused properties, ensure single `SketchRepository` |
| `Core/Models/Preferences.swift` | Edit — keep only `gridOpacityStep`, `gridType`; delete enums/keys for removed features |
| `Core/Models/Sketch.swift` | Edit — drop `mode`, add safe `init(from:)` default |
| `Core/Models/Stroke.swift` | Edit or **Delete** — remove if redundant with `PKDrawing` serialization |
| `Core/Grid/GridOverlayView.swift` | Edit — early-return on `opacity == 0`, hoist constants, suppress animation |
| `Core/Persistence/SketchRepository.swift` | Edit — ensure metadata-only listing |
| `Core/Persistence/SketchStore.swift` | Edit — defer heavy decode |
| `Features/Canvas/CanvasView.swift` | Rewrite — single `ZStack`, edge controls, sessions corner button, inline save UI |
| `Features/Canvas/PencilCanvasView.swift` | Edit — fix `updateUIView` to avoid recreating `PKCanvasView` |
| `Features/Canvas/CanvasToolbar.swift` | **Delete** |
| `Features/QuickNote/QuickNoteView.swift` | **Delete** (and folder) |
| `Features/Settings/SettingsView.swift` | **Delete** (and folder) |
| `Features/Sessions/SessionsView.swift` | Edit — drop the `onNavigateToSettings` parameter; expose "New" + "Save" actions usable from the corner sheet |
| `Features/Sessions/SessionRow.swift` | Likely unchanged; verify |

---

## 8. Acceptance criteria

The change is correct when **all** of the following hold:

1. Launching the app shows a transparent window with a faint grid (or no grid at opacity 0), a vertical slider on the right edge, three small grid buttons next to it, and a single circular Sessions button in the top-right corner. Nothing else.
2. There is no tab bar, no top navigation bar, no Settings screen, no Quick Note mode anywhere in the binary.
3. Dragging the opacity slider snaps to the six discrete steps with a haptic tick on each step (device only). Strokes never fade.
4. Tapping a grid button immediately swaps the grid style. Tapping the same button again does nothing (it is already selected — do not toggle off).
5. The Sessions corner button opens a sheet that lists saved sketches and offers "New" and "Save current" actions. Saving prompts for a title inline.
6. Apple Pencil draws. Finger draws. There is no setting to change this.
7. Persistence works without any user toggle. Killing and relaunching the app restores the last-edited drawing into the canvas.
8. `grep -r "OverlayMode\|CanvasMode\|QuickNote\|persistenceEnabled\|pencilOnly\|CanvasToolbar\|RootView\|SettingsView" swift-app/` returns zero matches.
9. Project builds with **zero warnings** in Xcode.
10. On an iPad device or simulator, drawing latency is visibly identical to Apple Notes — no per-stroke jank, no grid flicker on opacity changes.
11. The build target is **iPad only**. Attempting to install or run on iPhone, Mac (Catalyst), or visionOS is rejected by the device family settings. Xcode's "Supported Destinations" lists only iPad.

---

## 9. Reporting

When done, reply with:

- A bullet list of every file deleted.
- A bullet list of every file modified, one line each describing the substantive change.
- Any deviation from §7 with a one-sentence justification.
- The result of the `grep` command in §8 item 8.
- Confirmation of zero build warnings, or the list of remaining warnings if any.

Do **not** include implementation code in the report — the diff is the report. Keep prose under 200 words.

---

## 10. Out of scope (do not do these here)

- Supabase integration / cloud sync
- Authentication
- Export to PNG / PDF
- Stroke thickness UI (pen width stays fixed at the current default)
- Color picker UI changes
- Onboarding or empty states beyond the bare minimum needed for the Sessions sheet
- Any change to the `mockup/`, `docs/`, or top-level Expo files (a separate prompt will retire those)

If you find yourself reaching for one of these, stop and surface the question instead.
