# Overlay Notes — Documentation

This folder is the **source of truth** for any AI tool (Claude Code, Cursor, Kiro,
GitHub Copilot, Codex, etc.) or human contributor who wants quick context on the
project.

## How to read this folder

Start with the files in this order:

1. `01-vision.md` — what the product is and is **not**.
2. `02-architecture.md` — how the code is laid out across the three top-level
   folders (`swift-app/`, Expo prototype, `mockup/`).
3. `03-features.md` — the current feature set.
4. `04-data-model.md` — Supabase schema + the persistence on/off contract.
5. `05-ui-spec.md` — visual language, grid overlay rules, transparency.
6. `history/` — dated change log entries. **Append a new entry every time a
   meaningful behavior or structure changes.** Do not edit old entries.

## Conventions for AI tools

- **Never** reintroduce photo backgrounds (lesson/math/code). The canvas is
  always transparent with an optional geometric grid.
- **Never** assume persistence is always on. Gate all Supabase calls behind
  `preferences.persistenceEnabled`.
- **Never** use purple or indigo hues.
- Keep files small and single-purpose.
- Write a `history/YYYY-MM-DD-short-slug.md` entry when you change user-facing
  behavior, data shape, or folder structure.
