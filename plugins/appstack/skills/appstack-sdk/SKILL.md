---
name: appstack-sdk
description: >-
  Best practices for integrating and using the Appstack mobile attribution SDKs
  (Swift/iOS, Kotlin/Android, React Native, Flutter, Unity). Use when installing,
  configuring, or reviewing an Appstack SDK integration; designing an event
  taxonomy (standard vs. custom events, sendEvent); wiring enhanced app
  campaigns (EACs) with revenue and matching parameters; connecting partner
  integrations like Superwall or RevenueCat; or troubleshooting attribution and
  events not appearing.
---

# Appstack SDK integration

Appstack is a **mobile attribution** platform for apps and games that run paid
ads. The SDK measures installs and post-install in-app events, attributes them to
ad campaigns, and forwards enriched signals to ad networks (Meta, Google, TikTok,
Apple Ads) to power **enhanced app campaigns (EACs)**.

Keep this mental model front and center: **this is an attribution SDK, not a
product-analytics SDK.** Every rule below follows from that. "Should I track this
for attribution / ad optimization?" is the question that guides you. If the goal
is "funnel analytics across 50 screens," Appstack is the wrong tool and
over-instrumenting it actively *degrades* attribution quality.

## Platform reference files

Core concepts are identical across platforms; only install, initialization
location, and method signatures differ. Load the file for the platform in play —
each contains full, ready-to-paste code including **where to initialize**,
real-world `sendEvent` examples, partner-integration wiring, and troubleshooting:

- iOS / Swift → [references/swift.md](references/swift.md)
- Android / Kotlin → [references/kotlin.md](references/kotlin.md)
- React Native → [references/react-native.md](references/react-native.md)
- Flutter → [references/flutter.md](references/flutter.md)
- Unity → [references/unity.md](references/unity.md)

**React Native 3.0.0 is a breaking major.** When reviewing an existing RN app,
check the installed major *before* reading or writing any Appstack call — the
2.x and 3.x call shapes are mutually incompatible. See
[references/react-native.md](references/react-native.md).

Always pin the **latest stable** version from the registry (SPM/GitHub, Maven
Central, npm, pub.dev) — never assume an old pinned version.

## The core API — same four calls, **different signatures per platform**

Every platform exposes the same four operations, and the *concepts* below hold
everywhere. The **call shapes do not** — return types, failure signals, and
argument lists differ per platform, sometimes substantially.

**Never write a call from the concept alone. Open the platform reference file
and copy its signature.** The table below is a map of where the differences are,
not a substitute for that file.

1. **`configure(apiKey, ...)`** — call **once**, as early as possible in app
   startup, **before any other SDK call**. A repeat call is a no-op everywhere:
   it cannot change the key, log level, or user ID. Init location per platform:
   iOS `AppDelegate didFinishLaunching` or SwiftUI `@main init`; Android
   `Application.onCreate()`; React Native app-startup `useEffect`; Flutter
   `main()` after `WidgetsFlutterBinding.ensureInitialized()` and before
   `runApp`; Unity either the Appstack Project Settings auto-initializer or one
   manual startup call.
2. **`sendEvent(...)`** — report an in-app event. Prefer standard `EventType`
   values. Four platforms take a separate name argument for custom events;
   React Native 3.x does not (see below).
3. **`getAppstackId()` / `getAttributionParams()`** — read the Appstack user ID
   and attribution payload to forward to partner integrations. Call them after
   `configure` when possible. This pair has the **widest divergence** of the
   four, and it is what the Superwall/RevenueCat flows depend on — getting the
   call style wrong here produces broken paywall wiring.
4. **`enableAppleAdsAttribution()`** — iOS only; call after configuration on
   iOS 15+. Wrappers guard or no-op this call on Android. It is not an
   environment switch and should not be used as a substitute for ATT consent
   handling in the host app.

### Where the platforms actually differ

| | Swift | Kotlin | Flutter | Unity | React Native 3.x |
| --- | --- | --- | --- | --- | --- |
| `sendEvent` shape | `(event, name?, parameters?)` | `(event, name?, parameters?)` | `(EventType, {eventName, parameters})` | `(EventType, eventName, parameters)` | **`(event, parameters?)`** — no name arg |
| `sendEvent` returns | Void | Unit | **`Future<bool>`** | void | `Promise<void>` |
| custom event via | `.CUSTOM` + name | `EventType.CUSTOM` + name | `EventType.custom` + `eventName` | `EventType.CUSTOM` + `eventName` | **pass the name directly**; no `CUSTOM` |
| `configure` failure signal | *silent* | `InitListener` callback | **throws** | void + pre-build validation | **returns `false`** |
| `getAttributionParams` | `async` → `[String: Any]?` | **synchronous** → `Map<String, String>` | `Future` | **callback-based** | `Promise` |
| `getAppstackId` | sync | sync | `Future` | sync | `Promise` |
| clear customer user ID | pass `nil` | pass `null` | pass `null` | **`ClearCustomerUserId()`** | pass `null` |

Two consequences worth internalizing:

- **`configure` reports failure four different ways.** If you are not reading
  the platform's signal — boolean, throw, listener, or nothing at all — you have
  no idea whether the SDK came up.
- **Attribution-parameter readiness also differs**, independently of call style:
  iOS waits for its initial match and always returns an `appstack_match_status`
  key; Android does not report that key and may return an empty map until data
  arrives. Check for the key rather than assuming both platforms provide it.

`INSTALL` is tracked **automatically** on initialization — never send it manually.

## Event taxonomy — the highest-leverage best practice

This is where most integrations go wrong.

### Prefer standard events; use custom events sparingly

The SDK ships a fixed set of standard `EventType` values that ad networks map to
their own optimization events. Always reach for a standard event first:

- **Auth/account:** `LOGIN`, `SIGN_UP`, `REGISTER`
- **Monetization:** `PURCHASE`, `ADD_TO_CART`, `ADD_TO_WISHLIST`,
  `INITIATE_CHECKOUT`, `START_TRIAL`, `SUBSCRIBE`
- **Games/progression:** `LEVEL_START`, `LEVEL_COMPLETE`
- **Engagement:** `TUTORIAL_COMPLETE`, `SEARCH`, `VIEW_ITEM`, `VIEW_CONTENT`,
  `SHARE`
- **Catch-all:** a custom event (see below — how you send one is
  platform-specific)

(Casing differs by platform — `.PURCHASE` on Swift, `EventType.PURCHASE` on
Kotlin, `EventType.PURCHASE` or `'PURCHASE'` on React Native,
`EventType.purchase` on Flutter, `EventType.PURCHASE` on Unity. See the platform
file.)

**Sending a custom event differs structurally, not just cosmetically.** On
Swift, Kotlin, Flutter, and Unity you pass the `CUSTOM` event type *plus* a
separate name. On React Native 3.x there is no `CUSTOM` value at all — you pass
your custom name as the event itself, and passing the literal `'CUSTOM'` is
rejected at runtime.

### Keep custom events under ~10 — more usually means misuse

**Guideline: an app should average fewer than ~10 distinct custom event names.**
Going well beyond that is a strong smell that the SDK is being treated as a
general product-analytics tool rather than an attribution tool.

Why this isn't arbitrary:

- Ad networks optimize against a **small set** of conversion events. Dozens of
  bespoke events dilute signal; the network can't optimize toward noise.
- Custom events are **not universally supported downstream.** For example,
  **TikTok does not support custom events for campaign optimization** — only
  standard events feed its optimization. A custom-heavy taxonomy silently loses
  signal on those networks.
- A sprawling custom taxonomy is almost always re-implementing standard events
  under different names (`user_purchased` instead of `PURCHASE`), which breaks
  the automatic mapping to ad-network events.

When you review an integration and see many custom events, treat it as a finding:

1. Map each custom event to a standard `EventType` where one exists and migrate.
2. Collapse near-duplicates (`buy`, `bought`, `purchase_done` → `PURCHASE`).
3. Keep only genuinely app-specific signals as custom events, with descriptive,
   consistent, `snake_case` names (`user_attributes`, `wallet_connected`).
4. If they truly need broad in-app analytics, that belongs in a product-analytics
   tool, not the attribution SDK.

### Never put PII or high-cardinality data in event names

Event **names** are identifiers, not payloads. Personal data, IDs, prices, or
per-item values go in **parameters**, never the name. `purchase_john@x.com` and
`level_47_complete` are both wrong.

### Event parameter values must be JSON-representable

Parameters are serialized to JSON on the way out. Every value must be a string,
number, boolean, or a nested array/object of those. A `Date`, `URL`, `Data`,
`Set`, class instance, or **non-finite number (`NaN`, `Infinity`)** is not
representable, and the consequences range from the key being silently dropped to
**the host app crashing** depending on platform and SDK version. Convert before
sending: dates to `YYYY-MM-DD` or an epoch number, everything else to a string
or number.

The realistic trigger is arithmetic, not exotic types. All three of these are
bugs:

- `revenue: price * quantity` where either operand is undefined → `NaN`
- `revenue: total / count` where `count` is `0` → `Infinity`
- `signup_date: <a native date object>` → not representable

`NaN` is the dangerous one because it is *typed* as a number, so no compiler and
no type annotation will catch it. Validate computed revenue before attaching it,
and omit the key rather than sending a non-finite value.

## Revenue & enhanced app campaigns (EACs)

For any event representing revenue (`PURCHASE`, `SUBSCRIBE`, `START_TRIAL`, …):

- Always send **`revenue`** (or `price`) as a number **and** **`currency`** as a
  string (`"USD"`, `"EUR"`). Revenue ranges are configured in the Appstack
  platform and synchronized automatically.

To improve match quality on Meta and TikTok, include these **matching
parameters** when the app has consent. Appstack **encrypts them automatically**
before matching:

- `email`
- `name` (first + last in one field)
- `phone_number` (also `phone` / `phoneNumber`)
- `date_of_birth` — `YYYY-MM-DD` (also `birthdate` / `birthday` / `dateOfBirth`)
- `gender`

These are the single biggest lever on EAC performance — send them on revenue
events wherever consent allows.

## Partner integrations (Superwall, RevenueCat)

Partners consume the Appstack ID and/or attribution params so paywalls and
subscription analytics can be attribution-aware. The general pattern is always:
**configure Appstack → configure the partner → read `getAppstackId()` /
`getAttributionParams()` → hand them to the partner before the first paywall /
offering loads.** Exact per-platform code is in each reference file.

- **Superwall** — set the Appstack ID via `setIntegrationAttributes`, and pass
  `getAttributionParams()` as Superwall **user attributes** before the first
  `register(placement:)`. Requires a Superwall SDK version with the Appstack
  attribute (iOS ≥ 4.12.11, Android ≥ 2.7.5, Flutter ≥ 2.4.11, `expo-superwall`
  ≥ 1.0.5). Use `expo-superwall` for React Native (legacy `react-native-superwall`
  is archived).
- **RevenueCat** — after `Purchases.configure`, build one `params` map from
  `getAttributionParams()` + `getAppstackId()` and pass it to
  `setAppstackAttributionParams(...)`, then use the returned offerings to present
  the paywall. Requires a version with that method (iOS `purchases-ios` ≥ 5.61.0,
  Android ≥ 9.23.0, RN `react-native-purchases` ≥ 9.12.0, Flutter
  `purchases-flutter` ≥ 9.14.0).

## Environments: production vs. development

- Appstack issues **separate API keys** per environment (Production /
  Development), under **SDK** in the dashboard for the selected app.
- Current native SDKs select the environment from the API key. `isDebug` and
  `endpointBaseUrl` are deprecated compatibility parameters on older call
  shapes and are ignored; use `logLevel` for diagnostics. Unity's automatic
  initializer selects development vs. production keys from its Project
  Settings environment mode and build type.
- Ship production builds with the production key and an appropriate non-debug
  log level.

## What the SDK can and can't do

**Can:**

- Track installs automatically and attribute them to campaigns.
- Report standard and custom in-app events with parameters, queued offline and
  sent asynchronously without blocking the main thread.
- Match revenue events against configured revenue ranges in real time.
- Enrich and forward signals to Meta, Google, TikTok, and Apple Ads.
- Expose `appstackId` and attribution params for partner integrations.

**Can't / limitations:**

- **Not a product-analytics or funnel tool** — don't instrument every tap/screen.
- **Custom events aren't universally optimizable** — TikTok ignores them for
  optimization; keep the standard-event set primary.
- **Attribution needs an official-store install** — App Store/TestFlight (iOS),
  Play Store (Android). Sideloaded/simulator installs may not attribute.
- **Apple Ads attribution needs iOS 15+** in the current native and wrapper
  SDKs, and can take **24–48 hours** to appear.
- **Android attribution** relies on the Play Install Referrer (available quickly
  for Play Store installs).
- **`INSTALL` is automatic** — never send it manually.
- Network is required to transmit (events queue offline until connectivity
  returns).
- The wrappers intentionally keep a small cross-platform surface. Custom
  endpoint overrides are not a supported app configuration, and attribution
  parameter readiness differs by platform: iOS waits for its initial match,
  while Android may return an empty map until data is available.

## Common mistakes to flag in review

- Configuring the SDK more than once, or relying on a repeat configuration to
  change keys or options.
- Sending `INSTALL` manually.
- Wrong environment key, or assuming the deprecated `isDebug` flag changes the
  environment.
- Dozens of custom events, or custom events duplicating standard ones.
- Revenue events missing `revenue`/`price` or `currency`.
- Computed revenue attached without a finite-number check (`price * quantity`,
  `total / count`), or a date/object passed as a parameter value.
- PII or high-cardinality values baked into event names.
- Hardcoded API keys committed to source control (use env vars / secure config).
- Calling `enableAppleAdsAttribution()` unconditionally on Android (guard it).
- Leaving verbose debug logging on in release builds.
- Reading attribution data before it is ready, or handing it to a partner after
  the paywall/offerings already loaded.

## Recommended workflow

New integration:

1. Identify the platform → load the matching reference file.
2. Install the latest SDK and wire `configure` at the correct startup location.
3. Set up per-environment keys; keep keys out of source where the host platform
   supports secure configuration, and use the platform's current `logLevel`
   controls for diagnostics.
4. Design a **small** event set: map real user actions to standard `EventType`s
   first; add at most a handful of clean custom events.
5. Add `revenue` + `currency` (and matching params where consented) to revenue
   events.
6. On iOS, enable Apple Ads attribution in the ATT flow.
7. Wire partner integrations after Appstack config, before the first paywall.
8. Verify events appear on the Appstack **SDK** page before enabling downstream
   integrations.

Reviewing an existing integration: walk the "Common mistakes" list and the
platform file's verification checklist, and specifically audit the event taxonomy
against the ≤10-custom-events guideline.
