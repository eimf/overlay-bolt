# Features

## Canvas

- **Fullscreen overlay** — transparent canvas covering the entire viewport.
- **Floating window** — draggable, resizable overlay for corner sketches.
- **Visibility toggle** — eye icon hides strokes without deleting them.
- **Pencil-only mode** — rejects finger input on native builds (iPad).

## Tools

| Tool         | Purpose                                    |
| ------------ | ------------------------------------------ |
| Pen          | Solid stroke, configurable width and color |
| Highlighter  | 3x wider, 35% opacity                      |
| Eraser       | Removes any stroke within a 14px radius    |
| Undo / Clear | Standard history controls                  |

## Grid overlays

All grids are drawn in white at ~18% opacity. Picking **None** means a fully
transparent canvas.

- `none` — no guide.
- `lines` — horizontal rule lines every 28px.
- `squared` — 28px grid squares.
- `dots` — 28px dot grid.

## Opacity control

A single slider (five steps: 20/40/60/80/100%) dims **the entire stroke layer**.
The grid is independent and always draws at its own built-in opacity.

## Persistence (optional)

- Toggle in **Settings > Persistence**.
- When **on**: Save button writes to Supabase; Sessions tab lists saved
  sketches.
- When **off**: Save button shows a notice; Sessions tab shows a hint pointing
  to Settings; no Supabase calls are made at all.
- User preference is stored in `localStorage` (web) and memory (native) under
  the key `overlay-notes-prefs-v1`.
