# Architecture

The repository is organized to let multiple runtimes coexist without tangling.

```
/                      (Expo / React Native prototype — runs in the browser and on device)
  app/                 Expo Router screens
  components/          Shared RN components (canvas, grid, toolbar, overlay)
  lib/                 Client-side utilities (supabase client, preferences store)
  constants/           Theme tokens
  supabase/            SQL migrations (source of truth for the DB schema)

swift-app/             Native iPad/iOS Xcode project (SwiftUI + PencilKit)
                       Lives on its own — does not share code with the Expo app.
                       See swift-app/README.md for how it mirrors the vision.

mockup/                Static HTML/CSS/SVG preview of the target UI.
                       Open mockup/index.html in any browser to review the design
                       without running the app.

docs/                  You are here. See docs/README.md first.
  history/             Dated change log. Append-only.
```

## Why three runtimes?

- **Expo app** is the fast iteration ground — it runs in the browser on every
  save, so visual and interaction tweaks land quickly.
- **swift-app/** is the shipping target. It uses PencilKit for Apple Pencil
  parity and SwiftUI for native feel. It should match the Expo prototype
  feature-for-feature but is free to diverge on platform-specific details.
- **mockup/** is a zero-dependency HTML preview for stakeholders who just want
  to *see* where the app is going without booting anything.

## Separation of concerns — rules

1. Nothing under `swift-app/` imports from the Expo app. Nothing in the Expo
   app imports from `swift-app/`.
2. The Supabase schema in `supabase/migrations/` is shared by both runtimes.
3. `mockup/` is static. No build step, no JS frameworks — just HTML and CSS.
