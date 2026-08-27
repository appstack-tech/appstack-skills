# Appstack React Native SDK

Read `SKILL.md` first for the cross-cutting rules (event taxonomy, EACs,
environments, limitations). This file covers React Native-specific setup,
real-world usage, and partner integrations.

## First: check which major is installed

`react-native-appstack-sdk` **3.0.0** changed `configure` and `sendEvent` in
ways that **throw** on the 2.x call shapes. Before writing or reviewing any
Appstack code here, read the *resolved* version — the range in the app's
`package.json` (`^2.6.0`) is not the answer:

```bash
npm ls react-native-appstack-sdk
```

- **3.x** → use this file as written.
- **2.x** → the API below does not apply. Use the mapping in
  [Migrating 2.x → 3.0](#migrating-2x--30) to read the existing code, and
  recommend the upgrade.

Getting this backwards is **not symmetric**, so do the check rather than
assuming:

- 2.x code on a 3.x SDK **throws immediately**, with the replacement named in
  the error message. Self-correcting.
- 3.x code on a 2.x SDK binds your parameters object to the `eventName` slot
  and dies in `eventName.trim()` behind a misleading "Failed to send event".
  Worse, `sendEvent('my_event')` with no parameters *looks* valid on 2.x: iOS
  sends it, while Android silently drops it as `INVALID_EVENT_NAME`.

## Requirements

- iOS 15.0+ (Xcode 16.0+ for the Swift 6 framework)
- Android min SDK 21, target 34+, Java 17+
- React Native 0.72.0+
- Node.js 16.0+

As of 3.0.0 the package is a real TurboModule (codegen spec `RNAppstackSdkSpec`)
and resolves through `TurboModuleRegistry`, so the same call sites work on both
the new and legacy architectures. No per-architecture setup is required.

## Install

```bash
npm install react-native-appstack-sdk
cd ios && pod install   # iOS only
```

Install the latest published version from npm. No extra Android setup is required
beyond installing the package.

## Initialize (app startup, once)

Default import `AppstackSDK`. `configure` is async and **returns `true`/`false`**
— check it. Use **platform-specific API keys** and keep them out of source.

```javascript
import { useEffect } from 'react';
import { Platform } from 'react-native';
import AppstackSDK from 'react-native-appstack-sdk';

const App = () => {
  useEffect(() => {
    (async () => {
      const apiKey = Platform.select({
        ios: process.env.APPSTACK_IOS_API_KEY,
        android: process.env.APPSTACK_ANDROID_API_KEY,
      });
      if (!apiKey) { console.error('Appstack API key not configured'); return; }

      const configured = await AppstackSDK.configure(apiKey, {
        logLevel: __DEV__ ? 0 : 1,
      });
      if (!configured) { console.error('SDK configuration failed'); return; }

      // Apple Ads attribution — iOS only, guard it
      if (Platform.OS === 'ios') {
        await AppstackSDK.enableAppleAdsAttribution();
      }
    })();
  }, []);
  // ...
};
```

Use separate dev and prod keys (e.g. `.env.development` / `.env.production` via
`react-native-config`).

### configure parameters

`configure(apiKey, { logLevel, customerUserId })` is the **only** supported form.

- `apiKey` (required, platform-specific, non-empty)
- `logLevel` — must be an **integer** `0`=DEBUG, `1`=INFO, `2`=WARN, `3`=ERROR
  (default `1`). A fractional value such as `1.5` now throws; in 2.x it passed
  validation and was silently truncated by the native casts.
- `customerUserId` — optional stable signed-in-user identifier

The 2.x positional form `configure(apiKey, isDebug, endpointBaseUrl, logLevel,
customerUserId)` was **removed in 3.0** and now throws. `isDebug` and
`endpointBaseUrl` are gone outright — neither was ever forwarded to the native
SDKs, so no behaviour is lost. The API key selects the Appstack environment.

### Customer user ID

```javascript
await AppstackSDK.setCustomerUserId('user-123'); // login
await AppstackSDK.setCustomerUserId(null);        // logout
```

The setter is safe before or after `configure`; make sure an event follows a
newly set ID so Appstack can form the install-to-user mapping. A repeat
`configure()` is a no-op and cannot change the ID.

## Sending events

`sendEvent(event, parameters?)` — async, resolves **`void`**.

There is no `eventName` argument and no separate "custom" mode:

- **Standard event** → pass an `EventType` (recommended), or its string name,
  matched case-insensitively.
- **Custom event** → pass your own name directly.

```javascript
import AppstackSDK, { EventType } from 'react-native-appstack-sdk';

await AppstackSDK.sendEvent(EventType.PURCHASE, { revenue: 29.99, currency: 'USD' });
await AppstackSDK.sendEvent('wallet_connected', { chain: 'ethereum' });
```

`EventType` values: `INSTALL`, `LOGIN`, `SIGN_UP`, `REGISTER`, `PURCHASE`,
`ADD_TO_CART`, `ADD_TO_WISHLIST`, `INITIATE_CHECKOUT`, `START_TRIAL`,
`SUBSCRIBE`, `LEVEL_START`, `LEVEL_COMPLETE`, `TUTORIAL_COMPLETE`, `SEARCH`,
`VIEW_ITEM`, `VIEW_CONTENT`, `SHARE`. There is **no `EventType.CUSTOM`**.

### Rules the SDK enforces at runtime

- **`'CUSTOM'` is rejected.** It is the internal wire category, not a name —
  pass the name you actually want recorded.
- **`INSTALL` is dropped** before reaching native (logs an error, resolves
  normally), as are the internal `FIRST_OPEN` / `FIRST_OPEN_GUARDED` lifecycle
  events. Installs are recorded automatically.
- **Parameter keys valued `null`/`undefined` are stripped**, and an empty result
  is sent as no parameters at all. `0`, `false` and `''` are real values and are
  preserved.
- **In `__DEV__`, an unrecognised event string logs a warning** naming the custom
  event it became. This is the only place a typo like `'PURCAHSE'` is catchable
  — it would otherwise become a custom event silently, losing the standard-event
  semantics EACs optimise against. Advisory only; it never blocks the send.

`sendEvent` resolving does **not** mean the event was delivered — the native SDKs
still drop events when disabled, offline, or buffering. Nothing about delivery is
observable from JavaScript, which is why the old `true` return was removed. Do
not branch on the result.

### Parameter types

`parameters` is typed `Record<string, JsonValue | undefined>`. A `Date`, class
instance, or function is now a **compile error** rather than a value that fails
to survive the bridge. `AppstackEventParameters` and `JsonValue` are exported so
you can annotate your own payloads.

Values must also be JSON-*representable* at runtime, which the type system
cannot enforce. Guard computed numbers in particular: `{ revenue: price *
quantity }` with an undefined operand yields `NaN`, which is typed `number` but
is not valid JSON. Send a checked number or omit the key — see
`SKILL.md` for why this matters on every platform.

### Real-world examples

```javascript
// Auth
await AppstackSDK.sendEvent(EventType.SIGN_UP);
await AppstackSDK.sendEvent(EventType.LOGIN);

// Purchase with revenue + (consented) matching params for EAC/Meta
await AppstackSDK.sendEvent(EventType.PURCHASE, {
  revenue: 29.99,
  currency: 'USD',
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
  phone_number: user.phone,
  date_of_birth: user.dob,   // 'YYYY-MM-DD'
});

// Subscription / trial
await AppstackSDK.sendEvent(EventType.START_TRIAL, { revenue: 0, currency: 'USD' });
await AppstackSDK.sendEvent(EventType.SUBSCRIBE, { revenue: 9.99, currency: 'USD' });

// E-commerce funnel
await AppstackSDK.sendEvent(EventType.VIEW_ITEM, { item_id: sku });
await AppstackSDK.sendEvent(EventType.ADD_TO_CART, { item_id: sku });
await AppstackSDK.sendEvent(EventType.INITIATE_CHECKOUT);

// Custom — only when nothing standard fits; descriptive snake_case name
await AppstackSDK.sendEvent('wallet_connected', { chain: 'ethereum' });
```

## Migrating 2.x → 3.0

Every removed call shape throws with the replacement named in the message, so
the migration is mechanical — but a 2.x codebase will not run against 3.x until
it is done. Use this table both to migrate and to *recognise* 2.x code on sight.

| 2.x | 3.0 |
| --- | --- |
| `configure(key, false, undefined, 0, 'u1')` | `configure(key, { logLevel: 0, customerUserId: 'u1' })` |
| `sendEvent('PURCHASE', null, { revenue: 4.99 })` | `sendEvent(EventType.PURCHASE, { revenue: 4.99 })` |
| `sendEvent('CUSTOM', 'user_attributes', params)` | `sendEvent('user_attributes', params)` |
| `sendEvent('CUSTOM', 'APP_OPENED')` | `sendEvent('APP_OPENED')` |
| `if (await sendEvent(...)) {...}` | `await sendEvent(...)` — resolves `void`, do not branch |
| `EventType.CUSTOM` | removed — pass the custom name directly |
| `logLevel: 1.5` | must be an integer `0`–`3` |
| `new NativeEventEmitter(NativeModules.AppstackReactNative)` | remove — the iOS module is no longer an `RCTEventEmitter` |
| `isDebug` / `endpointBaseUrl` (incl. on the `AppstackConfig` type) | removed |

## Partner integrations

Read the Appstack ID / attribution params only **after `configure`**, and pass
them to the partner **before** the first paywall/offerings load.

### Superwall — use `expo-superwall` ≥ 1.0.5 (legacy `react-native-superwall` is archived)

```typescript
const { setIntegrationAttributes, update } = useUser();
const { registerPlacement } = usePlacement();

const appstackId = await AppstackSDK.getAppstackId();
await setIntegrationAttributes({ appstackId });

await update((await AppstackSDK.getAttributionParams()) ?? {});
await registerPlacement({ placement: 'onboarding_paywall' });
```

### RevenueCat (react-native-purchases ≥ 9.12.0)

```typescript
Purchases.configure({ apiKey: 'public_sdk_key' });

const base = (await AppstackSDK.getAttributionParams()) ?? {};
const params = { ...base };
const id = await AppstackSDK.getAppstackId();
if (id != null) params['appstack_id'] = id;

const offerings = await Purchases.setAppstackAttributionParams(params);
// Use `offerings` to present the correct paywall for this user
```

## Platform notes & RN-specific limitations

- **iOS Apple Ads:** iOS 15+, App Store/TestFlight install, data in 24–48h.
  Guard `enableAppleAdsAttribution()` with `Platform.OS === 'ios'`.
- **Android:** install-referrer collected automatically; attribution available
  quickly for Play Store installs.
- **Known RN limitations:** `enableAppleAdsAttribution()` is a no-op on Android;
  custom endpoint configuration is not a supported wrapper option. iOS
  attribution parameters include an `appstack_match_status` key after the initial
  match; Android does not report that key and can return an empty map until data
  is available — check for the key rather than assuming both platforms return it.

## Troubleshooting

- **A call throws naming "removed in 3.0":** the code is written against 2.x.
  See the migration table above.
- **Configure fails:** check the boolean return value; verify the platform key,
  that `logLevel` is an integer 0–3, and network.
- **Events missing:** check network, correct per-platform key, allow a few
  minutes. A misspelled standard event becomes a custom event — check the
  `__DEV__` warning.
- **iOS attribution missing:** iOS 15+, store/TestFlight install, allow 24–48h.

## Verification checklist

- [ ] Resolved major confirmed via `npm ls`; code matches that major.
- [ ] `react-native-appstack-sdk` installed; `pod install` run for iOS.
- [ ] Meets RN 0.72+, Node 16+, iOS 15+, Android min 21/target 34+, Java 17+.
- [ ] Separate iOS/Android keys; correct environment keys per build; keys not in source.
- [ ] `configure` runs once at startup before any event; return value checked.
- [ ] `configure` uses the options object; no positional/`isDebug` call remains.
- [ ] No `sendEvent` call passes three arguments or `'CUSTOM'`.
- [ ] No code branches on `sendEvent`'s return value.
- [ ] iOS-only calls guarded with `Platform.OS === 'ios'`.
- [ ] `INSTALL` never sent manually.
- [ ] Key flows use standard `EventType`s; custom events few and clean.
- [ ] Revenue events include `revenue`/`price` + `currency` (+ matching params),
      and computed revenue values are guarded against `NaN`.
- [ ] `expo-superwall` used for Superwall; partner attrs set after `configure`.
- [ ] Events visible on the Appstack SDK page before launch.
