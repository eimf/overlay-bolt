# swift-app/

This folder will hold the **native iOS / iPadOS Xcode project** for Overlay
Notes. It is intentionally separated from the Expo prototype at the repo root
so that Swift / Xcode tooling does not collide with the JavaScript toolchain.

## Intended layout

```
swift-app/
  OverlayNotes.xcodeproj/        Xcode project
  OverlayNotes/
    App/                         App entry, scene delegate
    Features/
      Canvas/                    SwiftUI + PencilKit canvas
      Sessions/                  List of saved sketches
      Settings/                  Persistence toggle, grid picker, opacity
    Core/
      Persistence/               Supabase client + @AppStorage toggle
      Grid/                      Grid rendering (Canvas API)
      Models/                    Sketch, Stroke
    Resources/
      Assets.xcassets
  README.md
```

## Parity rules

- The Swift app MUST match the vision in `docs/01-vision.md`:
  transparent overlay, no photo backdrops, optional geometric grid, persistence
  on/off.
- Use **PencilKit** for the drawing surface to get real Apple Pencil support.
- Use **@AppStorage("persistenceEnabled")** as the source of truth for the
  cloud-save toggle. Do not call Supabase when it is `false`.
- Match the Supabase schema in `../supabase/migrations/`.

## Getting started

1. Open this folder in Xcode (once the project is scaffolded).
2. Set your Team in **Signing & Capabilities** (Personal Team is fine for
   development).
3. Add the Supabase Swift SDK via Swift Package Manager:
   `https://github.com/supabase-community/supabase-swift`.
4. Read `../docs/04-data-model.md` for the table shape before wiring network
   calls.

## Why separate from the Expo app

- Different toolchains (xcodebuild vs. metro).
- Different language (Swift vs. TypeScript).
- Different deployment targets (App Store vs. web preview).
- Keeps `git diff` noise contained per side of the project.
