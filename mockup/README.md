# mockup/

A **zero-dependency** HTML preview of the Overlay Notes UI. No frameworks, no
build step — open `index.html` in any browser.

## Why

Stakeholders (and AI tools that don't want to boot an Expo dev server) can
review the target visual language in seconds.

## What it shows

- Transparent canvas with switchable grid overlays (Dots / Lines / Squared /
  None).
- Top chrome: brand pill, title pill, cloud indicator.
- Bottom toolbar: pen, highlighter, eraser, undo, clear, save.
- Persistence toggle in the page header that flips the cloud indicator.

## Files

- `index.html` — layout.
- `styles.css` — design tokens and component styles (kept in sync with
  `../constants/theme.ts`).
- `script.js` — grid swap and toggle behavior.

## Not shown

- Real drawing interaction. The strokes on the canvas are static SVG samples
  intended to illustrate pen / highlighter / shape output.
