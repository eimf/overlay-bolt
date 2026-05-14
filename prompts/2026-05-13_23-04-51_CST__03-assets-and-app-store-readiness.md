# Overlay — Asset Completion + App Store Submission Readiness

**Version:** 03
**Created:** 2026-05-13 23:04:51 CST
**Scope:** `swift-app/overlay_v1/Overlay/` (SwiftUI / PencilKit, **iPad only**) and project root assets/configs.
**Follows:** `01-translucent-overlay-redesign.md`, `02-restore-color-eraser-app-translucency.md`
**Intent:** Complete every visual and metadata asset the app needs, and bring the project to a state where it can be submitted to the iPad App Store with no missing requirements. This is a readiness pass — no new features, no UX changes.

This prompt is a **checklist contract**. Treat each item under §6 as a deliverable. Do not skip items. If something cannot be produced from inside the agent's environment (e.g., a real Apple Developer account or final marketing screenshots from a physical device), explicitly mark it `MANUAL` in the report and describe the exact step the human owner must take.

---

## 1. Read first — what this prompt is and is not

**It is:** an asset-and-compliance pass to make the app submission-ready for the iPad App Store, **plus** a forensic investigation of why the opacity slider is not actually making the app transparent.

**It is not:** a feature change beyond fixing the transparency regression. Do not redesign UI, refactor architecture beyond what the checklist demands, or wire Supabase. (A separate prompt will handle cloud sync.)

The app remains **iPad-only**. All asset specs below assume iPad-only targeting.

---

## 1.5 Critical defect to fix in this pass — the opacity slider is fake

### 1.5.1 Symptom (reported by the user, must be reproduced first)
Moving the app-opacity slider currently changes the **darkness** of the app's fill from darker to lighter — i.e., it interpolates a color value from `#0B0D10` toward something lighter. **The window itself is still fully opaque.** When Overlay is placed next to another app in Split View / Stage Manager, the user cannot see the app behind Overlay through Overlay's window at any slider value. That is a regression of prompt 02's §3 ("see through the whole app") and the entire premise of the product.

The agent must, before doing anything else in this prompt:
1. Reproduce the bug on the iPad simulator with two apps tiled.
2. Capture a short note in the report describing what the slider is currently doing in code (e.g., "the fill layer's `.fill(Color.black.opacity(...))` is the only thing animated; the `UIWindow` is still fully opaque, and the canvas root view's background is `.background(.regularMaterial)` which is opaque").
3. Only then proceed to the fix.

### 1.5.2 Recursive Apple-documentation investigation (mandatory, inlined here)

The agent must still re-read each Apple source listed below and confirm it against the **current** docs (Apple updates these), but the digest below is inlined into this prompt so the implementing AI has it without needing a separate file. **Do not create `TransparencyInvestigation.md`.** Update this section in place if the docs say something different from what is captured here.

Sources to consult (all on https://developer.apple.com):

1. `UIWindow` — `/documentation/uikit/uiwindow`
2. `UIView.isOpaque` — `/documentation/uikit/uiview/1622622-isopaque`
3. `UIView.backgroundColor` — `/documentation/uikit/uiview/1622591-backgroundcolor`
4. `UIWindowScene` — `/documentation/uikit/uiwindowscene`
5. Scene composition — `/documentation/uikit/app_and_environment/scenes`
6. Multitasking spec — `/documentation/uikit/app_and_environment/scenes/specifying_the_scenes_your_app_supports`
7. Information Property List reference — `/documentation/bundleresources/information_property_list` (search for `UIApplicationIsOpaque`)
8. Materials / Liquid Glass HIG — `/design/human-interface-guidelines/materials`
9. ReplayKit — `/documentation/replaykit` ; ScreenCaptureKit — `/documentation/screencapturekit`

Inlined digest (per source, what it says and how it applies to "make Overlay's window let the app behind show through"):

- **`UIWindow`**: A window is the root container of a scene's view hierarchy. It is itself a `UIView`, so `backgroundColor` and `isOpaque` apply. Setting `backgroundColor = .clear` and `isOpaque = false` causes the window's own pixels to be blended with whatever the system places below the window in its scene's render tree.
- **`UIView.isOpaque`**: Apple's documentation explicitly states that when `isOpaque = false`, the view's content is blended with content beneath it. When `true`, the view must fill its bounds with fully opaque content; otherwise rendering is undefined. For Overlay, every ancestor of the canvas must have `isOpaque = false` and a clear (or alpha < 1) `backgroundColor`. A single opaque ancestor anywhere in the chain defeats transparency for everything below it.
- **`UIView.backgroundColor`**: Default is `nil` (transparent) for plain `UIView`, but **`UIViewController.view` defaults to opaque white/system background** when loaded by the system, and many SwiftUI hosting controllers introduce an opaque background. This is the most common reason "I set the window clear and it still looks solid" — a child view controller is painting over it.
- **`UIWindowScene`**: Each app gets its own scene. Scenes are composited by the system, not by the app. A third-party app cannot reach into another app's scene to read or render its pixels. This is the architectural reason verdict (A) is essentially impossible for arbitrary apps.
- **Scene composition / multitasking**: In Split View and Stage Manager, the OS arranges two or more scenes side-by-side or in stacked windows. Each scene paints into its own rectangle. There is no blend mode that would let App A's window pixels pass through to show App B's pixels in the same screen region. The only "see-through" the OS provides for a clear window is to whatever the OS itself draws behind that window — generally black, the wallpaper (in some contexts), or, on iPadOS 26 with windowed mode, the desktop background of Stage Manager.
- **`UIApplicationIsOpaque`**: This key is referenced in old Stack Overflow / Open Radar threads and was historically used on iOS 7 to allow a clear window to show the home-screen wallpaper. It is **not** documented in the current Information Property List reference. Treat it as **private / undocumented**. Do not add it without a current Apple doc URL; it is a known App Review rejection risk.
- **Materials / Liquid Glass**: iPadOS 26 introduced `Material` styles (`.ultraThinMaterial`, `.regularMaterial`, etc.). These render frosted-glass effects by sampling **content within the same scene**, not other apps. Useful for the edge controls (legible chrome) but irrelevant to cross-app see-through.
- **ReplayKit / ScreenCaptureKit**: These provide screen recording with **explicit user permission**, not real-time compositing of other apps into your view. Using them to fake a "see-through" effect would violate App Review (5.1 privacy, 2.5 software requirements) and is not viable.

**Verdict (most likely outcome — confirm during implementation): (B) / (C) hybrid.**

- A correctly clear `UIWindow` on iPadOS lets the user see **whatever the OS draws behind Overlay's own scene rectangle** — typically the wallpaper in full-screen mode and the Stage Manager / desktop background in windowed mode on iPadOS 26.
- **iPadOS does not let Overlay composite over another third-party app's window.** When two apps are tiled in Split View, each owns its own half of the screen; there is no overlap region to blend. In Stage Manager with overlapping windows, the front window occludes the one behind it — there is no public API to make it translucent against the other.
- Therefore the slider's honest job is: **control how much of Overlay's own scene rectangle is filled vs. clear**, revealing the OS background (not a neighboring app's pixels) at low values.

If, during implementation, the agent finds a current, public Apple API that contradicts this verdict, update this section in place and link the doc.

### 1.5.3 Implementation rules per verdict

**If (A):** Implement the documented API. Cite the doc URL in code comments. Verify on simulator and a real device.

**If (B) or (C) (most likely):** Do all of the following, even though some may already be in place — re-verify each from scratch:

1. In `OverlayApp.swift` (or wherever the `UIWindow` is created), set:
   - `window.isOpaque = false`
   - `window.backgroundColor = .clear`
   - The hosting `UIViewController.view.isOpaque = false`
   - The hosting view's `backgroundColor = .clear`
2. The SwiftUI root container uses `.background(Color.clear)` and **must not** apply `.background(.regularMaterial)`, `.background(.ultraThinMaterial)`, or any solid color at the root.
3. Every parent SwiftUI view between the window and the canvas must be transparent. Walk the hierarchy with the SwiftUI debugger; any view introducing a non-clear background is a bug.
4. The "app fill" layer (the one driven by the opacity slider) must be a **single** full-screen `Rectangle().fill(Color(hex: "#0B0D10").opacity(step / 100))` rendered just behind the strokes. At slider = 0 the fill's alpha is 0 and the layer renders **truly clear pixels** (verify by sampling a pixel in the simulator's screenshot — it must be transparent, not `#0B0D10` at low alpha).
5. **Also fix `Info.plist`**: ensure no `UIRequiresFullScreen = YES` (which would prevent Split View). Add (and document) `UIApplicationIsOpaque = NO` only if the §1.5.2 verdict says it is publicly supported on the current iPadOS; otherwise do **not** add it (it is a private key and would risk rejection).
6. Update the user-facing copy / label of the slider if needed. If the verdict is (C) and the slider can only ever reveal wallpaper or black, **say so honestly in `Settings` help text** and in the App Store description. Do not advertise "see other apps through the canvas" if the OS does not allow it.

### 1.5.4 Honest reporting back to the user

The report must include a one-paragraph plain-English explanation, sourced from the investigation, of exactly what the slider can and cannot do on iPadOS. If the verdict is (C), the agent must explicitly write: "On iPadOS, third-party apps cannot composite over other third-party apps. The slider controls Overlay's own fill — at 0 it reveals whatever the OS draws behind Overlay's own window region (the wallpaper in full-screen, or nothing in Split View where Overlay's region does not overlap the other app). To draw on top of another app's content, the user places Overlay next to it via Split View / Stage Manager and uses the slider to fade Overlay's own background, with strokes remaining visible." Do not soften this. The user needs the truth so the product framing is correct.

### 1.5.5 Acceptance criteria for the fix
1. With Overlay full-screen and the slider at 0, a screenshot shows the device wallpaper through Overlay's canvas region (only strokes + edge controls visible from Overlay).
2. With Overlay in Split View next to Safari and the slider at 0, Overlay's region shows transparent against the OS background; Safari is visible in **its own** half of the screen because the OS places them side-by-side. (If the verdict is (A) and full compositing is possible, Safari is also visible through Overlay's region — note this clearly.)
3. The slider fade is **alpha**, not a color shift. Visually verify by stopping at 50% — it must look like 50% transparent, not like a midtone gray fill.
4. No private API or undocumented Info.plist key is added without an explicit, current Apple doc reference.
5. The §1.5.2 inlined digest has been re-verified against current Apple docs and updated in place if anything has changed.

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

### 6.15a Transparency defect fix (cross-reference to §1.5)

- [ ] §1.5.2 inlined digest re-verified against current Apple docs and updated in place if needed.
- [ ] §1.5 implementation applied.
- [ ] §1.5.5 acceptance criteria all pass.
- [ ] If marketing copy in §6.10 (`Metadata.md`) implied "see other apps through Overlay" and the verdict is (C), rewrite the copy to match reality.

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
