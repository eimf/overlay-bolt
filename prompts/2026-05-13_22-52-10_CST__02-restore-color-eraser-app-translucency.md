# Overlay — Restore Pen Controls + Make the Whole App See-Through

**Version:** 02
**Created:** 2026-05-13 22:52:10 CST
**Scope:** `swift-app/overlay_v1/Overlay/` (SwiftUI / PencilKit, **iPad only**)
**Follows:** `2026-05-13_22-05-20_CST__01-translucent-overlay-redesign.md`
**Intent:** The previous redesign removed the color picker and the eraser, and it conflated "app opacity" with "grid opacity." Both are wrong. Put pen color and eraser controls back as edge controls, and make the **entire app window** see-through so any app behind it is visible — not just the canvas area. Only the on-edge controls themselves remain visually solid enough to read and tap.

---

## 1. Read this first — what is broken right now

After prompt 01 shipped, the app has these regressions:

1. **No way to change pen color.** Strokes only draw in the default accent. The user used to have a color picker. It is gone. Put it back.
2. **No eraser tool.** The user used to be able to switch from pen to eraser. It is gone. Put it back.
3. **Opacity slider is mislabeled in behavior.** It currently controls **grid opacity only**. The user wants a slider that controls the **opacity of the entire app window** so that whatever app is open behind Overlay (Safari, Notes, Xcode, etc.) is visible through the Overlay window.

Item 3 is the most important and the most easily misunderstood. Read §3 carefully before changing anything.

---

## 2. iPad-only reminder

This app is iPad-only. Do not add iPhone, Catalyst, or visionOS adaptations. Assume regular size class. Minimum deployment iPadOS 17.0. (Same constraints as prompt 01 — do not regress them.)

---

## 3. The "see-through entire app" requirement (critical — do not get this wrong)

### 3.1 What the user wants
When Overlay is running alongside another app (Split View, Slide Over, or Stage Manager), the user wants to see **the other app through Overlay's window**, not just through the canvas area. Today, only the canvas is transparent — every other surface in Overlay (control backgrounds, sheets, etc.) is opaque-ish and blocks the view.

The slider, going forward, controls **how transparent the Overlay window itself is**. At 100% the app is fully opaque (you cannot see anything behind). At 0% the app is invisible (only strokes and the edge controls remain visible). Between those, the app fades.

### 3.2 What "see through the whole app" means in practice
- The `UIWindow` background is `.clear` and `isOpaque = false` (already true from prompt 01 — keep it).
- The root SwiftUI container's background is `Color.clear`.
- The canvas area is `Color.clear`.
- **Every element that is not an active control or a stroke must contribute zero pixels to the composited output beyond what the user explicitly enables via the slider.** No translucent panels covering the full screen. No `.background(.ultraThinMaterial)` on the canvas root. No semi-opaque scrim. Nothing.
- If the slider is at 0%, the only pixels Overlay paints are: the user's strokes, the grid (if grid opacity is non-zero — that is a separate setting, see §5), and the four edge controls.
- If the slider is at 100%, Overlay's canvas background fills with the app's solid dark color (`#0B0D10` or similar) so behind apps are fully hidden.

### 3.3 How to implement window-level opacity on iPad
iPadOS does **not** let a third-party app set a per-window alpha against the OS compositor (you cannot make the actual `UIWindow` semi-transparent against other apps in Stage Manager — the OS owns that compositing). What you **can** do, and what this prompt requires:

- Keep the `UIWindow` truly clear (not alpha-blended — actually clear, so the OS shows the app behind in the rectangle Overlay does not paint).
- Render a single full-screen `Color` layer (the "app fill") **behind** the canvas strokes, with its alpha driven by the slider. At slider = 0 the layer's alpha is 0 (fully clear → behind app shows through). At slider = 100 the layer's alpha is 1 (solid → behind app hidden). Discrete steps as in prompt 01 (`0, 10, 25, 50, 75, 100`).
- The strokes and grid render **above** the app fill layer, so they are always visible regardless of slider position.
- The edge controls render **above everything** with their own fixed translucency (see §6) — they are not affected by the slider.

This approach gives the user the perceived effect of "the whole app is see-through" because every Overlay surface other than the controls participates in the slider's alpha.

### 3.4 What to rename
- Rename `gridOpacityStep` → `appOpacityStep` (preference key + variable). Migrate any existing stored value: read the old key once, write to the new key, leave the old key untouched (do not delete from `UserDefaults`; iPad-only app, low blast radius, but be safe).
- The slider's accessibility label becomes "App opacity". Its on-screen icon (if any) is a window/rectangle symbol, not a grid symbol.
- Grid opacity is **separate and fixed at 100% when grid is on**. The three grid buttons (`Dots`, `Lines`, `Squared`) toggle the grid type. There is no per-grid opacity control anymore — if the user wants the grid less visible, they reduce app opacity, which fades everything Overlay paints together. Simpler. Fewer dials.
- An additional grid state: tapping the currently-selected grid button **turns the grid off**. (This contradicts prompt 01's "tapping the same button does nothing" rule — override it. The user needs a way to disable the grid, and a fourth "off" button is wasteful.) Store grid type as an optional: `nil` = off, otherwise the selected style.

---

## 4. Pen color picker (restore)

### 4.1 Placement
- **Left edge**, vertically centered, mirroring the right-edge stack.
- A vertical column of 6 small color swatches, ~28×28pt each, ~10pt vertical spacing, ~12pt left inset, respecting safe area.

### 4.2 Palette (fixed — no custom picker)
Six colors, in this order top → bottom:
1. `#E8EAED` (off-white — default)
2. `#0B0D10` (near-black)
3. `#4ADE80` (accent green)
4. `#60A5FA` (blue)
5. `#F87171` (red)
6. `#FBBF24` (amber)

These are the only choices. No color wheel, no hex input, no recent-colors list. Six fixed swatches, period.

### 4.3 Selection
- The active swatch shows a 2pt outer ring in `#E8EAED` at 100% alpha.
- Inactive swatches are filled solid at 100% alpha (so they are readable regardless of app opacity — see §6).
- Tap = select. Haptic `selection` feedback. Persist as `PreferenceKeys.penColorHex` (string).

---

## 5. Eraser tool (restore)

### 5.1 Placement
- Bottom of the **left edge** column, below the color swatches, with ~16pt extra spacing to separate it from the palette.
- Single circular button, ~32pt, SF Symbol `eraser` (or `eraser.fill` for the active state).

### 5.2 Behavior
- Tap = switch the canvas tool from `PKInkingTool` to `PKEraserTool(.bitmap)`.
- When the eraser is active, the button shows the filled variant + a 2pt accent ring; the color swatches dim to 40% alpha (visual cue: "you are not drawing in a color right now").
- Tapping any color swatch while the eraser is active switches back to inking with that color.
- Persist the active tool mode as `PreferenceKeys.toolMode` (`"pen" | "eraser"`).

---

## 6. Edge controls — visual contract

The edge controls (left column: 6 colors + eraser; right column: 3 grid buttons + opacity slider; top-trailing: Sessions button) are **always legible** regardless of the app opacity slider. They live in a layer that is **not** affected by the opacity slider.

- Each control sits inside its own rounded-rect or capsule background using `.regularMaterial` (not `.ultraThinMaterial` — we need it readable when behind apps are bright).
- Material alpha is fixed at 100% in the control layer. Do not animate it. Do not make it depend on `appOpacityStep`.
- Tappable area extends ~8pt beyond the visual bounds (use `.contentShape`).
- The whole control set sits above the canvas strokes in z-order so a stroke that crosses under a control is still drawn but the control occludes it visually.

This way, even at app opacity 0% (Overlay fill fully clear), the user can still see and operate the controls.

---

## 7. Updated layout

```
+--------------------------------------------------------------+
|                                                  [Sess]      |  <- top-trailing corner
|                                                              |
|  [W]                                                  [Dot]  |  <- W=off-white
|  [B]                                                  [Lin]  |     B=black
|  [G]                                                  [Sqr]  |     G=green
|  [b]                                                         |     b=blue
|  [r]                                                  | |    |  <- vertical app-opacity slider
|  [a]                                                  | |    |     (renamed; no longer "grid")
|                                                       | |    |
|  [Eraser]                                                    |
|                                                              |
+--------------------------------------------------------------+
```

Both edge columns: ~44pt wide. Canvas fills the full window. Edge controls overlay the canvas; they do not push it inward.

---

## 8. Files you will touch

| File | Action |
|---|---|
| `App/OverlayApp.swift` | Verify `UIWindow` stays `isOpaque = false`, background `.clear`. No change expected. |
| `Core/Models/Preferences.swift` | Rename `gridOpacityStep` → `appOpacityStep`. Add `penColorHex` (String, default `#E8EAED`) and `toolMode` (String, default `"pen"`). Make `gridType` optional / nullable to support "off" via tapping the active button. |
| `Core/Grid/GridOverlayView.swift` | Render at 100% alpha when a grid type is selected; render nothing when type is `nil`. Drop opacity input. |
| `Features/Canvas/CanvasView.swift` | Add app-fill layer behind strokes whose alpha is `appOpacityStep / 100`. Add left-edge color column + eraser. Keep right-edge grid buttons + slider. Wire color and tool to `AppEnvironment`. |
| `Features/Canvas/PencilCanvasView.swift` | Accept `tool: PKTool` (either `PKInkingTool` or `PKEraserTool`). Switch instances when `toolMode` changes; do not recreate `PKCanvasView`. |
| `App/AppEnvironment.swift` | Expose `currentColor: Color`, `currentTool: PKTool` derived from preferences; remove any stale defaults from prompt 01. |

Do **not** create new files for the color picker or eraser — they live inline in `CanvasView.swift` as small private subviews. Keep the file under ~250 lines; if it grows beyond that, extract `LeftEdgeControls` and `RightEdgeControls` as private structs in the same file (do not add new files).

---

## 9. Performance + hygiene (do this in the same pass)

- Updating `appOpacityStep` must not invalidate the strokes layer. Confirm by ensuring the strokes view's identity does not depend on the opacity value.
- The color swatch column must not rebuild on every stroke. It depends only on `penColorHex` and `toolMode`.
- Eraser switching must not re-instantiate `PKCanvasView`. Mutate `tool` on the existing instance inside `updateUIView`.
- No new `@AppStorage` keys beyond those in §8. No new dependencies.
- Project must build with **zero warnings**.

---

## 10. Acceptance criteria

The change is correct when **all** of the following hold:

1. With Overlay open in Split View next to Safari and the opacity slider at 0%, the user sees Safari's content through Overlay's entire window — including the regions where the canvas, the grid, and any non-control surfaces would otherwise paint. Only strokes, the grid (if enabled), and the four edge controls are visible from Overlay.
2. With the slider at 100%, Overlay is fully opaque dark — Safari is hidden behind it.
3. The slider snaps through `0, 10, 25, 50, 75, 100` with haptic ticks; intermediate values are not possible.
4. Six color swatches are present on the left edge. Tapping a swatch makes subsequent strokes that color. The active swatch has a visible ring.
5. An eraser button sits below the swatches. Tapping it switches to erase mode; tapping a swatch switches back. Switching does not lag or flash.
6. Tapping the currently-selected grid button hides the grid (sets `gridType` to `nil`). Tapping any grid button while none is selected re-enables that grid.
7. Edge controls are legible and tappable at every slider position, including 0%. The control backgrounds do not fade with the slider.
8. `grep -r "gridOpacityStep" swift-app/` returns zero matches (the key was renamed).
9. Killing and relaunching the app preserves: app opacity step, grid type (or off), pen color, tool mode, last drawing.
10. Build target is still iPad only. Zero build warnings.

---

## 11. Reporting

When done, reply with:
- The list of files modified, one line each.
- Confirmation that prompt 01's iPad-only constraints (§1.1) are still in force.
- Confirmation of zero build warnings.
- The result of the grep in §10 item 8.
- One short paragraph (≤80 words) describing how you implemented the "see through the whole app" effect, so the user can verify the approach matches §3.3.

Do not paste code in the report.

---

## 12. Out of scope

- Cloud sync / Supabase wiring (a later prompt will handle this).
- Variable pen width UI (width stays fixed at the existing default).
- Custom color picker (only the 6 fixed swatches).
- Per-grid-opacity control (deleted on purpose — the app slider covers it).
- Any rework of the Sessions sheet beyond what is needed to keep it working.

If a requirement here conflicts with prompt 01, **this prompt wins** for the affected behavior. Note the conflict in the report so the trail is clear.
