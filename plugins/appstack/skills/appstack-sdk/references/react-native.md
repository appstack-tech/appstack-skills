# Appstack React Native SDK

Read `SKILL.md` first for the cross-cutting rules (event taxonomy, EACs,
environments, limitations). This file covers React Native-specific setup,
real-world usage, and partner integrations.

## Requirements

- iOS 13.0+ (14.3+ for Apple Ads), Xcode 14.0+
- Android min SDK 21, target 35+, Java 17+
- React Native 0.72.0+
- Node.js 16.0+

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

      const configured = await AppstackSDK.configure(apiKey);
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

## Sending events

`sendEvent(eventType, eventName, parameters)` — async, returns `true`/`false`.
Event types are **case-sensitive uppercase strings**. `eventName` is for custom
events (pass `null` otherwise); `parameters` is a plain object.

Event strings: `'LOGIN'`, `'SIGN_UP'`, `'REGISTER'`, `'PURCHASE'`, `'SUBSCRIBE'`,
`'ADD_TO_CART'`, `'ADD_TO_WISHLIST'`, `'INITIATE_CHECKOUT'`, `'START_TRIAL'`,
`'LEVEL_START'`, `'LEVEL_COMPLETE'`, `'TUTORIAL_COMPLETE'`, `'SEARCH'`,
`'VIEW_ITEM'`, `'VIEW_CONTENT'`, `'SHARE'`, `'CUSTOM'`. (`INSTALL` is automatic.)

### Real-world examples

```javascript
// Auth
await AppstackSDK.sendEvent('SIGN_UP');
await AppstackSDK.sendEvent('LOGIN');

// Purchase with revenue + (consented) matching params for EAC/Meta
await AppstackSDK.sendEvent('PURCHASE', null, {
  revenue: 29.99,
  currency: 'USD',
  email: user.email,
  name: `${user.firstName} ${user.lastName}`,
  phone_number: user.phone,
  date_of_birth: user.dob,   // 'YYYY-MM-DD'
});

// Subscription / trial
await AppstackSDK.sendEvent('START_TRIAL', null, { revenue: 0, currency: 'USD' });
await AppstackSDK.sendEvent('SUBSCRIBE', null, { revenue: 9.99, currency: 'USD' });

// E-commerce funnel
await AppstackSDK.sendEvent('VIEW_ITEM', null, { item_id: sku });
await AppstackSDK.sendEvent('ADD_TO_CART', null, { item_id: sku });
await AppstackSDK.sendEvent('INITIATE_CHECKOUT');

// Custom — only when nothing standard fits; descriptive snake_case name
await AppstackSDK.sendEvent('CUSTOM', 'wallet_connected', { chain: 'ethereum' });
```

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

- **iOS Apple Ads:** iOS 14.3+, App Store/TestFlight install, data in 24–48h,
  consent may be required (14.5+). Guard `enableAppleAdsAttribution()` with
  `Platform.OS === 'ios'`.
- **Android:** install-referrer collected automatically; attribution available
  quickly for Play Store installs.
- **Known RN limitations:** `enableAppleAdsAttribution()` is a no-op on Android;
  iOS endpoint configuration is not customizable yet (planned); event-name
  standardization is applied on Android but not yet on iOS.

## Troubleshooting

- **Configure fails:** check the boolean return value; verify the platform key
  and network.
- **Events missing:** check network, correct per-platform key, allow a few
  minutes. Event names must be uppercase and exact.
- **iOS attribution missing:** iOS 14.3+, store/TestFlight install, allow 24–48h.

## Verification checklist

- [ ] `react-native-appstack-sdk` installed; `pod install` run for iOS.
- [ ] Meets RN 0.72+, Node 16+, iOS 13+, Android min 21/target 35+, Java 17+.
- [ ] Separate iOS/Android keys; prod keys only in prod builds; keys not in source.
- [ ] `configure` runs once at startup before any event; return value checked.
- [ ] iOS-only calls guarded with `Platform.OS === 'ios'`.
- [ ] `INSTALL` never sent manually; event strings uppercase.
- [ ] Key flows use standard events; custom events few and clean.
- [ ] Revenue events include `revenue`/`price` + `currency` (+ matching params).
- [ ] `expo-superwall` used for Superwall; partner attrs set after `configure`.
- [ ] Events visible on the Appstack SDK page before launch.
