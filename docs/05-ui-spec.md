# UI Spec

## Colors

Tokens live in `constants/theme.ts`. Accent is a green (`#4ADE80`) — **never
purple or indigo**. Backgrounds are near-black; the *canvas itself* is fully
transparent.

## Typography

- Default system font.
- Three weights only: 500, 600, 800.
- Body line-height 150%, headings 120%.

## Spacing

8px base. Use the `spacing(n)` helper.

## Grid overlay rendering

Rendered once behind the stroke layer. Uses SVG `<pattern>` so it tiles cheaply
at any viewport size. Color is white, opacity 0.18, spacing 28px.

## Transparency rules

- **No background image** ever. The root view's background is `transparent`.
- The grid is a separate layer at ~18% opacity.
- The stroke layer's opacity is controlled by `preferences.canvasOpacity` and
  applies to the whole drawing — not to individual strokes.

## Chrome

- Top bar: brand + title input + (persistence indicator | visibility | pencil-only).
- Bottom bar: grid picker + opacity stepper + toolbar.
- All chrome uses translucent dark pills so the canvas beneath shows through.
