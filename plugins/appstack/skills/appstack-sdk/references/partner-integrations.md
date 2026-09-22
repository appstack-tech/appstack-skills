# Superwall and RevenueCat attribution

Read [SKILL.md](../SKILL.md) to select the platform reference, which contains
the exact integration calls. Swift, Kotlin, React Native, and Flutter have
official wiring. Unity does not have an official Appstack integration with
Superwall or RevenueCat.

Appstack prioritizes connected subscription-platform purchase, trial,
subscription, and renewal data over equivalent SDK revenue events. Sending SDK
events as well is harmless, but the partner's attribution wiring matters most:
otherwise the prioritized revenue can arrive without campaign context. Renewals
come from the connected platform; there is no standard renewal `EventType`.
A gap between SDK-sent revenue and dashboard revenue can therefore be expected.

## Order of operations

1. Configure Appstack and the partner.
2. After Appstack configuration, read the Appstack ID and attribution parameters
   using the methods for the installed platform and version.
3. Hand both to the partner before the first paywall or offerings load.

Attribution-parameter readiness differs by platform. iOS's async
`getAttributionParams()` waits for its initial match. Native Android's
synchronous `getAttributionParams()` may return an empty map while matching is
in progress; its suspending `awaitAttributionParams()` waits for that phase and
is the choice when wiring a partner soon after configuration. Android does not
report `appstack_match_status`; do not require that key. Wrapper call styles
also differ, so follow the selected platform reference.

## Partner-specific wiring

- **Superwall:** set the Appstack ID through `setIntegrationAttributes` and
  pass attribution parameters as Superwall user attributes before the first
  placement registration. Use a version with the Appstack attribute: iOS
  ≥ 4.12.11, Android ≥ 2.7.5, Flutter ≥ 2.4.11, or `expo-superwall` ≥ 1.0.5.
  React Native uses `expo-superwall`; `react-native-superwall` is archived.
- **RevenueCat:** after `Purchases.configure`, combine the attribution parameters
  and Appstack ID in one map, pass it to `setAppstackAttributionParams(...)`,
  then use the returned offerings to present the paywall. The method requires
  iOS `purchases-ios` ≥ 5.61.0, Android ≥ 9.23.0, React Native
  `react-native-purchases` ≥ 9.12.0, or Flutter `purchases-flutter` ≥ 9.14.0.

Check the resolved partner version as well as the Appstack SDK version before
using a code example. Where an official integration exists and the app uses
that partner for subscriptions, missing attribution wiring is a review finding.
