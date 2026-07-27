# Appstack Flutter plugin

Read `SKILL.md` first for the cross-cutting rules (event taxonomy, EACs,
environments, limitations). This file covers Flutter-specific setup, real-world
usage, and partner integrations.

## Requirements

- iOS 13.0+ (14.3+ for Apple Ads), Xcode 14.0+
- Android min SDK 21, target 35+
- Flutter 3.3.0+, Dart 2.18.0+

## Install

```bash
flutter pub add appstack_plugin
flutter pub get
cd ios && pod install   # iOS only
```

Use the current version from [pub.dev](https://pub.dev/packages/appstack_plugin).
The iOS `AppstackSDK.xcframework` is bundled — no extra iOS dependencies.

**Android** — ensure `android/build.gradle` has the repositories:

```gradle
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}
```

## Initialize (main(), before runApp, once)

Type is `AppstackPlugin`. Configure after
`WidgetsFlutterBinding.ensureInitialized()` and before `runApp`. Use
platform-specific keys.

```dart
import 'package:flutter/material.dart';
import 'package:appstack_plugin/appstack_plugin.dart';
import 'dart:io' show Platform;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final apiKey = Platform.isIOS ? 'your-ios-api-key' : 'your-android-api-key';
  await AppstackPlugin.configure(apiKey);

  if (Platform.isIOS) {
    await AppstackPlugin.enableAppleAdsAttribution();
  }
  runApp(MyApp());
}
```

### configure parameters

- `apiKey` (required, platform-specific)
- `isDebug` (optional, default `false`) — must match the key's environment
- `endpointBaseUrl` (optional)
- `logLevel` (optional int: `0`=DEBUG, `1`=INFO, `2`=WARN, `3`=ERROR; default `1`)

`configure` completes when done and **throws if configuration fails** — wrap in
try/catch if you need to handle it.

## Sending events

`sendEvent(EventType, {eventName, parameters})`. `EventType` uses **camelCase**
enum values. `parameters` is `Map<String, dynamic>`; returns `true` on success.
`eventName` is required only when `eventType` is `custom`.

`EventType` values (camelCase): `login`, `signUp`, `register`, `purchase`,
`addToCart`, `addToWishlist`, `initiateCheckout`, `startTrial`, `subscribe`,
`levelStart`, `levelComplete`, `tutorialComplete`, `search`, `viewItem`,
`viewContent`, `share`, `custom`. (`EventType.install` is automatic — never send
it.)

### Real-world examples

```dart
// Auth
await AppstackPlugin.sendEvent(EventType.signUp);
await AppstackPlugin.sendEvent(EventType.login);

// Purchase with revenue + (consented) matching params for EAC/Meta
await AppstackPlugin.sendEvent(
  EventType.purchase,
  parameters: {
    'revenue': 29.99,
    'currency': 'USD',
    'email': user.email,
    'name': '${user.firstName} ${user.lastName}',
    'phone_number': user.phone,
    'date_of_birth': user.dob,   // 'YYYY-MM-DD'
  },
);

// Subscription / trial
await AppstackPlugin.sendEvent(EventType.startTrial, parameters: {'revenue': 0, 'currency': 'USD'});
await AppstackPlugin.sendEvent(EventType.subscribe, parameters: {'revenue': 9.99, 'currency': 'USD'});

// E-commerce funnel
await AppstackPlugin.sendEvent(EventType.viewItem, parameters: {'item_id': sku});
await AppstackPlugin.sendEvent(EventType.addToCart, parameters: {'item_id': sku});
await AppstackPlugin.sendEvent(EventType.initiateCheckout);

// Games
await AppstackPlugin.sendEvent(EventType.levelComplete, parameters: {'level': 3});

// Custom — only when nothing standard fits; descriptive snake_case name
await AppstackPlugin.sendEvent(
  EventType.custom,
  eventName: 'wallet_connected',
  parameters: {'chain': 'ethereum'},
);
```

## Partner integrations

Read the Appstack ID / attribution params only **after `configure`**, and pass
them to the partner **before** the first paywall/offerings load.

### Superwall (Superwall-Flutter ≥ 2.4.11)

```dart
await Superwall.shared.setIntegrationAttributes({
  IntegrationAttribute.appstackId: await AppstackPlugin.getAppstackId(),
});

await Superwall.shared.setUserAttributes(
  (await AppstackPlugin.getAttributionParams()) ?? {},
);
await Superwall.shared.register('onboarding_paywall');
```

### RevenueCat (purchases-flutter ≥ 9.14.0)

```dart
await Purchases.configure(PurchasesConfiguration('public_sdk_key'));

final base = await AppstackPlugin.getAttributionParams() ?? <String, dynamic>{};
final params = Map<String, dynamic>.from(base);
final id = await AppstackPlugin.getAppstackId();
if (id != null) params['appstack_id'] = id;

final Offerings offerings = await Purchases.setAppstackAttributionParams(params);
// Use `offerings` to present the correct paywall for this user
```

## Development environment

Development key + `isDebug: true` + `logLevel: 0`. The flag must match the key.

```dart
final apiKey = Platform.isIOS
    ? const String.fromEnvironment('APPSTACK_IOS_API_KEY')
    : const String.fromEnvironment('APPSTACK_ANDROID_API_KEY');
await AppstackPlugin.configure(apiKey, isDebug: true, logLevel: 0);
```

## Platform notes

- **iOS Apple Ads:** iOS 14.3+, App Store/TestFlight install, 24–48h, consent may
  be required (14.5+). Guard with `Platform.isIOS`.
- **Android:** install-referrer collected automatically; attribution quick for
  Play Store installs. `enableAppleAdsAttribution()` returns false on Android.

## Troubleshooting

- **Configure fails / throws:** key/environment correct; `configure` runs from
  `main()` after `ensureInitialized()` and before `runApp`; `flutter pub get` and
  (iOS) `pod install` completed.
- **Events missing:** `configure` completes before first `sendEvent`; network up;
  revenue events include numeric `revenue`/`price` + valid `currency`.
- **Android attribution missing:** Play Store install; min 21 / target 35+;
  required repositories present in Android Gradle config.

## Verification checklist

- [ ] `appstack_plugin` from pub.dev; `flutter pub get` + iOS `pod install` done.
- [ ] Meets Flutter 3.3+, Dart 2.18+, iOS 13+, Android min 21/target 35+.
- [ ] Android repositories (`google()`, `mavenCentral()`, `jitpack.io`) present.
- [ ] Separate iOS/Android keys; prod keys with `isDebug: false` in prod builds.
- [ ] `configure` runs once from `main()` before `runApp`.
- [ ] iOS-only calls guarded with `Platform.isIOS`.
- [ ] `EventType.install` never sent manually.
- [ ] Key flows use standard `EventType`s; custom events few and clean.
- [ ] Revenue events include `revenue`/`price` + `currency` (+ matching params).
- [ ] Partner IDs/attributes set after `configure`, before first paywall.
- [ ] Events visible on the Appstack SDK page before launch.
