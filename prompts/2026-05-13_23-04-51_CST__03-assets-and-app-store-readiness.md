# Overlay — Asset Completion + App Store Submission Readiness

**Version:** 03
**Created:** 2026-05-13 23:04:51 CST
**Scope:** `swift-app/overlay_v1/Overlay/` (SwiftUI / PencilKit, **iPad only**) and project root assets/configs.
**Follows:** `01-translucent-overlay-redesign.md`, `02-restore-color-eraser-app-translucency.md`
**Intent:** Complete every visual and metadata asset the app needs, and bring the project to a state where it can be submitted to the iPad App Store with no missing requirements. This is a readiness pass — no new features, no UX changes.

This prompt is a **checklist contract**. Treat each item under §6 as a deliverable. Do not skip items. If something cannot be produced from inside the agent's environment (e.g., a real Apple Developer account or final marketing screenshots from a physical device), explicitly mark it `MANUAL` in the report and describe the exact step the human owner must take.

---

## 1. Read first — what this prompt is and is not

**It is:** an asset-and-compliance pass to make the app submission-ready for the iPad App Store, **plus** a product pivot away from app-window translucency toward a "reference image + translucent grid overlay" model that is achievable within Apple's public APIs.

**It is not:** a redesign of the rest of the UI, an architecture refactor beyond what §1.5 demands, or a Supabase wiring pass. (Cloud sync stays in a later prompt; if reference images need to persist across sessions or sync to other iPads, that persistence MUST use the existing Supabase project — see `lib/supabase.ts` and the `sketches` migration — never a non-Supabase store.)

The app remains **iPad-only**. All asset specs below assume iPad-only targeting.

---

## 1.5 Product pivot — drop app-window translucency, add reference-image background

### 1.5.0 Why this pivot

Investigation (see §1.5.2 below — kept for record) confirmed iPadOS does not let a third-party app composite over another third-party app's window. The previous "see the app behind Overlay" pitch is not achievable with public APIs and is not worth chasing further. Instead, we deliver the same end-user value — "trace / annotate over a reference" — by letting the user **place a reference image inside Overlay's own canvas** and controlling the **overlay's** translucency on top of that image.

### 1.5.1 What we are removing

- The app-window opacity slider and any logic that animates the app's window background, fill color, or root SwiftUI background based on a `step` / `appOpacity` value.
- All marketing copy, settings help text, and onboarding that says or implies "see the app behind" / "draw on top of any app" / "translucent overlay over other apps." Replace with the framing in §1.5.4.
- Any `UIWindow.isOpaque = false` / `backgroundColor = .clear` plumbing that exists solely to support the discontinued cross-app translucency. The window can return to its default opaque behavior. (If any of that plumbing also benefits the new reference-image flow, keep it — but do not ship code that exists only to support a feature we no longer offer.)

Delete the dead code rather than commenting it out. Remove the slider control from the toolbar/settings (or repurpose it per §1.5.3 below for the **overlay** opacity, not the **app** opacity).

### 1.5.2 Apple-doc record (kept for posterity, do not act on it for this pass)

The earlier investigation is preserved here so future passes don't redo the work. Sources reviewed: `UIWindow`, `UIView.isOpaque`, `UIView.backgroundColor`, `UIWindowScene`, scenes / multitasking, the Information Property List reference, the Materials HIG, and ReplayKit / ScreenCaptureKit (all on https://developer.apple.com). Verdict: iPadOS sandboxes each app to its own scene rectangle; a clear `UIWindow` reveals only the OS background (wallpaper / Stage Manager desktop), never another app's pixels. `UIApplicationIsOpaque` is undocumented and a review risk. ReplayKit / ScreenCaptureKit are explicit screen-recording APIs and not viable for live cross-app compositing. **Conclusion: shift to the in-app reference-image model in §1.5.3.**

### 1.5.3 What we are adding — reference-image background + overlay grid + overlay opacity

The new flow:

1. The canvas has three stacked layers, bottom-to-top:
   - **Reference image layer** (new): a single full-canvas image picked by the user. `nil` by default (no image).
   - **Overlay layer** (existing grid + tint, now repurposed): the dot/line grid plus a tintable fill. This whole layer's alpha is what the slider controls.
   - **Strokes layer** (existing PencilKit canvas): always fully opaque user ink, never affected by the slider.
2. The toolbar gets **one new button**: "Reference Image" (icon: `photo` SF Symbol). Tapping it opens a sheet with two actions, in this order:
   - **Use Latest Screenshot** — appears as the primary action **only if** a screenshot has been taken on the device within the last 60 seconds and is accessible via `PHPhotoLibrary` with the user-granted permission. If unavailable or denied, hide this row (do not show it greyed out). Detection rule: query `PHAsset.fetchAssets(with: .image, options:)` filtered by `mediaSubtypes contains .photoScreenshot`, sorted by `creationDate` descending, take the first asset, accept it only if `creationDate >= now - 60s`.
   - **Choose from Photos** — opens `PHPickerViewController` (PHPicker, the privacy-preserving picker that does **not** require photo-library permission). This is the always-available path.
3. Picking an image sets it as the reference layer with `.scaledToFit` inside the canvas bounds (no crop, letterboxed against the canvas background). Add a small "Remove image" affordance in the same sheet when an image is set.
4. The existing slider is **repurposed** to control the **overlay layer's alpha** (the grid + tint above the image), 0–100%. At 0% the overlay is fully transparent and the user sees the raw reference image with their strokes on top. At 100% the overlay is fully opaque and the reference image is hidden behind it. Default value: 60%. Label the slider "Overlay opacity" in the UI.
5. Strokes always render on top of both the reference image and the overlay, regardless of slider value.
6. Persistence: the chosen reference image is stored per-sketch (so reopening a sketch restores the image). Use the existing local sketch store first; the Supabase migration to sync reference images across devices belongs to the cloud-sync prompt. Store images on disk under the sketch's directory, not as base64 in JSON. Track the relative file path in the `Sketch` model.

### 1.5.4 Honest user-facing framing

Replace any prior copy with this voice:

- One-liner: "A translucent grid you can drop on top of any photo or screenshot, then sketch over."
- Paragraph: "Pick a screenshot or photo as a reference. Overlay drops a grid on top of it; slide the overlay's opacity to balance how much of the image you see versus how much grid you see. Then draw with Apple Pencil. Strokes always stay crisp on top."
- Do not claim cross-app translucency anywhere.

### 1.5.5 Permissions and Info.plist

- Use `PHPickerViewController` for the "Choose from Photos" path — it does **not** require `NSPhotoLibraryUsageDescription`.
- The "Use Latest Screenshot" path **does** require photo-library read access (because `PHAsset.fetchAssets` reads the library directly). Add `NSPhotoLibraryUsageDescription` with the string: `Overlay reads your most recent screenshot only when you tap "Use Latest Screenshot," so you can sketch over it.` Request access lazily — only when the user first taps that row, never on launch.
- Do **not** add `NSPhotoLibraryAddUsageDescription` (we never write to the library).
- Confirm `UIRequiresFullScreen` is absent or `NO` so Split View still works.
- Drop any `UIApplicationIsOpaque` key if it was added.

### 1.5.6 Acceptance criteria for the pivot

1. The toolbar shows a "Reference Image" button. Tapping it opens a sheet with the rules in §1.5.3 step 2.
2. If a screenshot was taken in the last 60 seconds and photo-library permission is granted, "Use Latest Screenshot" appears as the primary row and selecting it loads that screenshot as the canvas's reference image with no extra picker step.
3. "Choose from Photos" always appears, uses `PHPickerViewController`, and works without the user ever granting `NSPhotoLibraryUsageDescription`.
4. The slider, now labeled "Overlay opacity," controls only the grid+tint overlay layer. At 0% the reference image is fully visible behind strokes; at 100% the overlay fully hides the image. Strokes remain crisp at every slider value.
5. With no reference image set, the canvas behaves the same as before this pivot (grid + strokes on the app's solid background). The slider still controls the overlay layer's alpha — at 0% the user sees the bare app background.
6. No code path in the shipped binary still tries to make the `UIWindow` clear, animate window opacity, or claim cross-app translucency.
7. App Store description, in-app onboarding (if any), and the README all use the §1.5.4 framing exclusively.
8. Re-opening a sketch restores its previously chosen reference image from local storage.

---

## 2. Sources of truth (consult these — do not invent specs from memory)

Before producing any asset or filling any metadata field, fetch and follow the authoritative Apple documentation. If a spec below conflicts with Apple's current docs, **Apple wins** and the report must call out the discrepancy.

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Store submission overview: https://developer.apple.com/app-store/submitting/
- Human Interface Guidelines — App icons: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Human Interface Guidelines — iPadOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados
- Privacy manifest (`PrivacyInfo.xcprivacy`) requirements: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
- Required reason API list (used to fill the privacy manifest): https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
- App Tracking Transparency (only if you ever add tracking — we do not): https://developer.apple.com/documentation/apptrackingtransparency
- Encryption export compliance (`ITSAppUsesNonExemptEncryption`): https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations
- App Store Connect — App information / metadata fields: https://developer.apple.com/help/app-store-connect/manage-app-information/
- Screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/

The agent must `mcp__tavily__web_extract` at least the icon page, the privacy manifest page, and the screenshot specifications page during the work, and quote the relevant numbers in the report so we know they came from current docs (not stale training data).

---

## 3. iPad-only constraints (carried forward — do not regress)

- `UIDeviceFamily = [2]` (iPad only). No iPhone, no Catalyst, no visionOS.
- Minimum deployment: iPadOS 17.0.
- All four iPad orientations supported.
- No compact-width layout branches.

If any asset spec below has phone-only variants, **omit them**. Only produce iPad assets.

---

## 4. Branding (lock these now so all assets use them)

The app's identity must be consistent across icon, screenshots, marketing copy, and in-app placeholder UI. Define them once in this section; every other asset references them.

- **Product name:** `Overlay` (working title — confirm with user before final submission; the report must flag this if not yet locked).
- **Subtitle (App Store, ≤30 chars):** `Sketch over anything`
- **Primary category:** `Productivity` (secondary: `Graphics & Design`).
- **Bundle identifier convention:** `com.<owner>.overlay` — leave the owner segment as a `MANUAL` placeholder in `app.json` / Xcode if not already set; do not invent one.
- **Color palette (from existing theme):** background `#0B0D10`, accent `#4ADE80`, foreground `#E8EAED`. Do not introduce new brand colors.
- **Typography for marketing assets:** SF Pro (Apple's default — free for use in App Store materials).
- **Voice:** terse, confident, utility-first. No exclamation marks. No emoji.

---

## 5. Documentation pass (do this before generating assets)

Read the Apple pages listed in §2 with `mcp__tavily__web_extract`. From each, capture the current numbers/requirements and write them into a new file at:

`swift-app/overlay_v1/AppStore/RequirementsSnapshot.md`

The snapshot file must include, at minimum:

- Required app icon sizes for iPad (with PPI).
- Required marketing icon size (1024×1024, no transparency, no rounded corners — verify).
- Screenshot dimensions accepted for iPad (12.9-inch and 13-inch iPad Pro are the current required sets — verify against the live screenshot spec page).
- Privacy manifest required keys for our app's API usage profile.
- Encryption export answer logic.
- Age rating questionnaire fields likely to apply (we expect `4+`).

The snapshot is a working document — accuracy at the time of capture is what matters. Date-stamp it at the top.

---

## 6. The submission-readiness checklist

Each item is a deliverable. The report at the end must mark each as `DONE`, `MANUAL`, or `BLOCKED` with a reason.

### 6.1 App icon

- [ ] Produce a single **1024×1024 PNG**, sRGB, **no transparency**, **no rounded corners** (Apple applies the mask). Save to `swift-app/overlay_v1/Overlay/Resources/AppIcon/AppIcon-1024.png`.
- [ ] Produce all required iPad icon sizes (look them up — at minimum 152×152 @1x and @2x for iPad, 167×167 for iPad Pro, 76×76 settings, 40×40 spotlight, 29×29 settings — confirm against current HIG). Place in an `AppIcon.appiconset` so Xcode picks them up.
- [ ] Icon design: a flat dark tile (`#0B0D10`) with a single `#4ADE80` scribble glyph centered. No text in the icon. No drop shadows. No Apple-style gradients.
- [ ] Export a separate **dark variant** and **tinted variant** if iPadOS 18+ icon variants are still required (verify via HIG).

### 6.2 Launch screen

- [ ] Provide a SwiftUI launch screen via `UILaunchScreen` in `Info.plist` (modern Apple-approved approach). Background `#0B0D10`. No text, no logo, no animation. The user sees a plain dark screen, then the canvas fades in. Do not ship the legacy `LaunchScreen.storyboard`.

### 6.3 Privacy manifest (`PrivacyInfo.xcprivacy`)

- [ ] Create `swift-app/overlay_v1/Overlay/PrivacyInfo.xcprivacy`.
- [ ] Declare `NSPrivacyTracking = false`.
- [ ] Declare `NSPrivacyTrackingDomains = []`.
- [ ] Declare `NSPrivacyCollectedDataTypes = []` (the app collects nothing — verify this remains true).
- [ ] Declare `NSPrivacyAccessedAPITypes` for any required-reason API the app touches. We currently use:
  - `NSPrivacyAccessedAPICategoryUserDefaults` → reason `CA92.1` (access info from same app, per current Apple docs — verify the exact reason code).
  - `NSPrivacyAccessedAPICategoryFileTimestamp` if `SketchRepository` reads file modification times — verify usage and add the reason or remove the call.
  - `NSPrivacyAccessedAPICategorySystemBootTime` → only if used. Audit the code; if unused, do not declare.
- [ ] Do not declare API categories the app does not actually use. Reviewers will reject incorrectly broad declarations.

### 6.4 Privacy nutrition label answers (App Store Connect)

- [ ] Prepare a `PrivacyAnswers.md` in `swift-app/overlay_v1/AppStore/` capturing the exact answers the human will paste into App Store Connect:
  - Data collection: **No data collected**.
  - Tracking: **No**.
  - Third-party SDKs: **None** (verify — confirm we are not pulling any analytics or crash SDK).

### 6.5 Permissions / `Info.plist` keys

- [ ] The app does not use camera, microphone, photo library, location, contacts, calendar, reminders, motion, Bluetooth, or local network. **Do not** declare usage strings for APIs we do not call. Each unnecessary `NS*UsageDescription` is a rejection risk.
- [ ] If Apple Pencil / PencilKit triggers any required key, document it. (PencilKit currently does not require a usage string.)

### 6.6 Capabilities and entitlements

- [ ] Default minimum entitlements only. No iCloud, no Push Notifications, no Sign in with Apple, no Background Modes, no Associated Domains. If any of these are present in `Overlay.entitlements`, remove them.
- [ ] No `com.apple.developer.kernel.increased-memory-limit` or other special entitlements.

### 6.7 Encryption export compliance

- [ ] Add `ITSAppUsesNonExemptEncryption = false` to `Info.plist`. The app uses only standard HTTPS (none currently) and Apple's built-in crypto. This avoids the per-build compliance question in App Store Connect.

### 6.8 Account / data management compliance

- [ ] Apple requires apps that allow account creation to allow account deletion in-app. The app currently has **no accounts** — confirm this is still true and document it in the readiness snapshot. If/when Supabase auth is added (later prompt), this section must be revisited.

### 6.9 Screenshots (iPad)

- [ ] Produce **5 marketing screenshots** at the required iPad resolution (verify current spec — historically 2048×2732 for 12.9" iPad Pro; check the live spec page).
- [ ] Screenshots must show the app in actual use, not photoshopped mockups. Capture them on the iPad simulator running the latest build.
- [ ] Suggested set:
  1. Canvas with a sketch over a recognizable system app behind (e.g., the simulator's home screen) — demonstrates translucency.
  2. Color picker open on the left edge with a color selected.
  3. Eraser active with an erased area visible.
  4. Sessions sheet open showing 2–3 saved sketches.
  5. Grid `Squared` enabled at higher app opacity, demonstrating the grid styles.
- [ ] Save originals at `swift-app/overlay_v1/AppStore/Screenshots/iPad-13-inch/01..05.png`.

### 6.10 App Store Connect metadata draft

- [ ] Create `swift-app/overlay_v1/AppStore/Metadata.md` with the exact text that will be pasted into App Store Connect:
  - Name (≤30 chars).
  - Subtitle (≤30 chars).
  - Promotional text (≤170 chars, can be updated without resubmission).
  - Description (≤4000 chars, no emoji, no marketing fluff — describe what the app does and how it works).
  - Keywords (≤100 chars total, comma-separated, no spaces between).
  - Support URL — `MANUAL` placeholder.
  - Marketing URL (optional) — `MANUAL` placeholder.
  - Privacy policy URL — **required**, `MANUAL` placeholder. Add a TODO that the human must publish a privacy policy and paste the URL.
  - Copyright string: `© 2026 <Owner>` — `MANUAL`.
  - Age rating questionnaire — pre-filled answers for a `4+` rating.

### 6.11 Build / project hygiene

- [ ] Bump `CFBundleShortVersionString` to `1.0.0` and `CFBundleVersion` to `1` (or whatever the next clean values are if these are already set).
- [ ] Confirm the bundle identifier is set at one place (Xcode project) and not divergent across config files.
- [ ] Ensure release build settings: optimization `-O`, dSYMs generated, bitcode irrelevant (deprecated), strip debug symbols on copy.
- [ ] Confirm `Hardened Runtime`-equivalent settings as Apple requires for the platform.
- [ ] Project compiles for **Release** with **zero warnings** for the `Any iPad Device (arm64)` destination.

### 6.12 TestFlight readiness

- [ ] Document the minimum TestFlight test plan in `swift-app/overlay_v1/AppStore/TestFlightNotes.md`:
  - Demo flow: launch → draw → change color → switch eraser → save → reopen from Sessions → adjust app opacity slider → toggle grid type → relaunch and verify state restored.
  - Known limitations: no cloud sync (local only); iPad only.
  - "Notes for Review" reviewer hint text reminding the reviewer the app's value depends on it being open alongside another app — instruct them to enter Split View.

### 6.13 Review-rejection risk audit

Walk the App Store Review Guidelines and explicitly call out and resolve our exposure on the most common rejection reasons:

- [ ] **2.1 Performance / Crash:** Cold launch + 30s of drawing must not crash. Memory must stay reasonable.
- [ ] **4.0 Design / Minimum Functionality:** The app must demonstrate clear native iPad value (PencilKit, translucent windowing). Document this in the reviewer notes.
- [ ] **4.2 Webview-only:** Not applicable — we are native SwiftUI.
- [ ] **5.1 Privacy:** Privacy manifest correct, no unnecessary permission strings, no data collection.
- [ ] **5.1.1(v) Account deletion:** No accounts → not applicable; documented.
- [ ] **2.3 Accurate metadata:** Description matches actual functionality. No mention of features not present (e.g., do not mention cloud sync until prompt 04 ships it).

### 6.14 Accessibility (do not skip)

- [ ] Every edge control has an `accessibilityLabel`. Color swatches read as e.g. `"Pen color: green"`. Eraser reads as `"Eraser tool"`. Slider reads as `"App opacity"` with `accessibilityValue` reflecting the percent.
- [ ] Tap targets ≥ 44×44pt (Apple's minimum). Verify the small icon buttons meet this with `.contentShape` if needed.
- [ ] Color is not the only signal of selection — every active state also has a ring or shape change.
- [ ] Test VoiceOver navigation order: top-trailing Sessions → left column (top to bottom) → right column (top to bottom). Adjust `accessibilitySortPriority` if needed.

### 6.15 Localization

- [ ] English (US) only for v1.0 — document in the metadata draft.
- [ ] All user-visible strings live in `Localizable.strings` (or `.xcstrings` catalog) so future localization is mechanical. No hard-coded `"Save"` literals scattered in views.

### 6.15a Reference-image pivot (cross-reference to §1.5)

- [ ] §1.5.1 removals applied: app-window opacity slider/logic deleted, marketing copy purged of cross-app translucency claims, dead window-clearing plumbing removed.
- [ ] §1.5.3 implementation applied: Reference Image button, "Use Latest Screenshot" detection (60s window + screenshot media subtype), `PHPickerViewController` for "Choose from Photos", three-layer canvas (image / overlay / strokes), slider repurposed to overlay opacity (default 60%), per-sketch persistence of reference image on disk.
- [ ] §1.5.5 Info.plist updated: `NSPhotoLibraryUsageDescription` added with the exact string from §1.5.5; no `NSPhotoLibraryAddUsageDescription`; no `UIRequiresFullScreen = YES`; no `UIApplicationIsOpaque`.
- [ ] §1.5.6 acceptance criteria all pass on simulator.
- [ ] §6.10 (`Metadata.md`) and any onboarding copy use only the §1.5.4 framing.

### 6.16 Persistence sanity for review

- [ ] Local persistence (existing `SketchRepository`) must survive app kill / cold relaunch. Verify on simulator.
- [ ] No leftover debug seeds, no hard-coded test sketches in release builds.

---

## 7. File / folder structure to produce

```
swift-app/overlay_v1/
├── Overlay/
│   ├── PrivacyInfo.xcprivacy                    (new)
│   ├── Resources/
│   │   └── AppIcon/
│   │       └── AppIcon.appiconset/              (full set)
│   └── (existing source untouched except as required by this prompt)
└── AppStore/                                     (new)
    ├── RequirementsSnapshot.md                   (§5)
    ├── Metadata.md                               (§6.10)
    ├── PrivacyAnswers.md                         (§6.4)
    ├── TestFlightNotes.md                        (§6.12)
    └── Screenshots/
        └── iPad-13-inch/
            ├── 01-canvas-translucent.png
            ├── 02-color-picker.png
            ├── 03-eraser.png
            ├── 04-sessions-sheet.png
            └── 05-grid-squared.png
```

If any binary asset (PNG icon, screenshots) cannot be generated by the agent, create the folder and a sibling `README.md` describing the exact spec and origin point so the human can drop the file in. Mark the deliverable `MANUAL`.

---

## 8. Reporting (this is non-negotiable)

When done, reply with a structured report:

1. **Documentation read:** the URLs you fetched and the date you fetched them.
2. **Checklist results:** every §6 item with status `DONE` / `MANUAL` / `BLOCKED` and a one-line note.
3. **Files added:** the new files under `swift-app/overlay_v1/AppStore/` and `Resources/AppIcon/`, with a one-line description each.
4. **Files modified:** anything else touched (e.g., `Info.plist`, `app.json`, entitlements), with the reason.
5. **Discrepancies:** any place Apple's current spec differed from this prompt's text — the prompt's numbers are guidance, Apple's docs are authoritative.
6. **Manual followups for the human:** a clean numbered list of every `MANUAL` item, what it is, and where it goes (e.g., "Privacy policy URL — paste into App Store Connect → App Privacy → Privacy Policy URL").
7. **Build status:** confirm `Release / Any iPad Device (arm64)` builds with zero warnings.

Keep the report under ~400 words. Do not paste code or asset binaries. Do not paraphrase the entire checklist back — only status per item.

---

## 9. Out of scope

- Supabase / cloud sync (next prompt).
- Authentication.
- In-app purchases / subscriptions.
- Localization beyond English-US.
- Marketing website, blog posts, press kit beyond what App Store Connect requires.
- Mac Catalyst, iPhone, or visionOS variants.

If the agent finds something in the codebase that blocks submission and is **not** covered by this checklist (e.g., a leftover debug log, a crash on first launch in Release), fix it and add a line under §8 item 4.
