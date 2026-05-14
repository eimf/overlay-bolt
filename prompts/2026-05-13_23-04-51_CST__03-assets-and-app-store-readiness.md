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

### 1.5.2 Recursive Apple-documentation investigation (mandatory)
Before writing the fix, the agent must read the following Apple sources end-to-end with `mcp__tavily__web_extract`, then summarize what each one says about **letting content from other apps show through your window** on iPadOS:

- `UIWindow` — https://developer.apple.com/documentation/uikit/uiwindow
- `UIView.isOpaque` — https://developer.apple.com/documentation/uikit/uiview/1622622-isopaque
- `UIView.backgroundColor` — https://developer.apple.com/documentation/uikit/uiview/1622591-backgroundcolor
- `UIWindowScene` — https://developer.apple.com/documentation/uikit/uiwindowscene
- App lifecycle / scene composition on iPadOS — https://developer.apple.com/documentation/uikit/app_and_environment/scenes
- Multitasking on iPad (Split View, Slide Over, Stage Manager) — https://developer.apple.com/documentation/uikit/app_and_environment/scenes/specifying_the_scenes_your_app_supports
- `UIApplicationIsOpaque` Info.plist key — search Apple's `Information Property List` reference at https://developer.apple.com/documentation/bundleresources/information_property_list and report whether this key is documented, deprecated, private, or absent.
- Liquid Glass / system materials on iPadOS 26 — https://developer.apple.com/design/human-interface-guidelines/materials
- ScreenCaptureKit / ReplayKit broadcast extensions (only relevant if "see app behind" turns out to require capturing other apps' content via user consent) — https://developer.apple.com/documentation/replaykit and https://developer.apple.com/documentation/screencapturekit

Save the digest at `swift-app/overlay_v1/AppStore/TransparencyInvestigation.md` with:
- One paragraph per source: what it says, and how it applies to "make Overlay's window let the app behind show through."
- A clear verdict at the end stating which of the three possible outcomes is true:
  - **(A) Officially supported:** there is a documented API to make a third-party app's window transparent against the OS compositor on iPadOS. List the exact API, the iPadOS version it landed in, and any review-guideline caveats.
  - **(B) Possible via standard APIs but with caveats:** e.g., `UIWindow.backgroundColor = .clear` + `isOpaque = false` only reveals the system wallpaper/black, not other apps' content, because each app is sandboxed in its own scene with no compositor blending against neighbors. Document the exact behavior on iPadOS in Split View vs. Stage Manager vs. full-screen.
  - **(C) Not possible:** iPadOS does not let a third-party app render translucently against another third-party app. The "see app behind" effect can only be achieved by **placing Overlay next to the other app** in Split View / Stage Manager so they share the screen side-by-side, not by compositing through Overlay. In that case, the slider's job is to control how much of Overlay's own area is filled vs. clear (revealing whatever the OS paints behind Overlay's window — typically the wallpaper or a black background, not the neighboring app's pixels).

The verdict drives the implementation in §1.5.3.

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
5. The `TransparencyInvestigation.md` file exists, cites at least 6 of the URLs in §1.5.2, and ends with one of the three verdicts.

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

- [ ] §1.5 investigation completed and `TransparencyInvestigation.md` written.
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
    ├── TransparencyInvestigation.md              (§1.5.2 — verdict + sources)
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
