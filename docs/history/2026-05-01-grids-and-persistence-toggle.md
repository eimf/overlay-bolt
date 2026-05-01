# 2026-05-01 — Grids and persistence toggle

## Context

The project previously ran the canvas on top of stock photos ("Lesson Mock",
"Math Paper", "Code", "Blank"). The product direction is a **transparent
overlay** with optional geometric guides, not a photo notebook.

Additionally, persistence was always on; anonymous Supabase sessions were
created on app start whether the user wanted cloud save or not.

## Changes

- **Removed** all `BACKDROPS` photo options from `app/(tabs)/index.tsx`.
- **Added** `components/GridBackground.tsx` with four modes: `none`, `lines`,
  `squared`, `dots`. Rendered as SVG patterns at ~18% opacity.
- **Added** `lib/preferences.ts` — a tiny reactive store (no external deps)
  persisted to `localStorage`. Holds `persistenceEnabled`, `gridType`,
  `canvasOpacity`.
- **Added** a `Persistence` section in `Settings` with a Switch to enable /
  disable cloud save. Also moved grid and opacity controls into Settings.
- **Canvas screen** now reads grid and opacity from preferences, and shows a
  cloud / cloud-off indicator in the top bar.
- **Sessions screen** short-circuits to an empty state when persistence is off
  and no longer calls Supabase.
- **Root layout** only calls `ensureSession()` when persistence is enabled.

## New folders

- `docs/` — this documentation set.
- `swift-app/` — placeholder for the native Xcode project (Swift + SwiftUI +
  PencilKit).
- `mockup/` — static HTML preview of the target UI.

## Migration notes

No database migration is required. The `background` column on `sketches` now
stores the grid key (`none` / `lines` / `squared` / `dots`) instead of photo
ids (`lesson` / `math` / `code` / `blank`). Existing rows are still readable —
unknown values render as no grid.
