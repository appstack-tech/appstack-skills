---
name: appstack-sdk
description: >-
  Integrate, review, or troubleshoot the Appstack mobile attribution SDK on
  Swift/iOS, Kotlin/Android, React Native, Flutter, or Unity. Use for SDK setup,
  event taxonomy, enhanced app campaigns, attribution, and supported Superwall
  or RevenueCat integrations.
---

# Appstack SDK

Appstack measures installs and post-install events for ad attribution and
campaign optimization. It is not a general event aggregator: send only events
and parameters that serve attribution or signals intended for ad networks.

## Start with the task and installed version

For an **existing app**, identify the platform and resolved Appstack SDK version
before using a code example. The references describe current APIs; compare the
installed version with its release notes or API documentation before applying a
call shape. React Native 2.x and 3.x have incompatible `configure` and
`sendEvent` signatures; its platform reference has a migration map. Do not turn
a review or bug fix into an SDK upgrade unless the user requests one or the fix
requires it.

For a **new install**, look up the latest stable version in the platform registry
and select that exact version. Do not use dynamic versions such as Gradle `+`.
For Unity's Android dependency, use the native version declared by the installed
Unity package.

Load the relevant references for the task:

| Task | Read |
| --- | --- |
| Install, initialize, use an SDK call, or debug platform behavior | The matching platform reference below |
| Design, send, or review events; revenue or matching parameters | [Event design](references/event-design.md) and the platform reference for code |
| Connect Superwall or RevenueCat; attribute paywall revenue | [Partner integrations](references/partner-integrations.md) and the platform reference for code |
| Review an integration or diagnose missing events/attribution | [Review and troubleshooting](references/review-troubleshooting.md) and the platform reference |

Platform references contain the install and call syntax. Use their signatures,
not a call shape remembered from another platform:

- Swift / iOS: [references/swift.md](references/swift.md)
- Kotlin / Android: [references/kotlin.md](references/kotlin.md)
- React Native: [references/react-native.md](references/react-native.md)
- Flutter: [references/flutter.md](references/flutter.md)
- Unity: [references/unity.md](references/unity.md)

Load another task reference only when the app or request needs it. Unity has no
official Appstack integration with Superwall or RevenueCat.

## Rules shared by every platform

- Configure once at app startup before sending events or reading attribution.
  Reconfiguration does not change the key, log level, or user ID. The customer
  user ID setter may run before configuration.
- Get separate development and production keys from **SDK** in the Appstack
  dashboard, and use the key for the build's environment. Deprecated `isDebug` and
  `endpointBaseUrl` options do not select the environment; use `logLevel` for
  diagnostics.
- `INSTALL` is automatic. Never send it manually.
- Prefer standard event types. Custom-event syntax and return values differ by
  platform; React Native 3.x passes the custom name directly and has no `CUSTOM`
  event type.
- Send only JSON-representable event parameters. Check computed numbers for
  `NaN` and `Infinity`; a type annotation alone cannot catch them.
- Enable Apple Ads attribution only on iOS 15+ after configuration. If the host
  app requests ATT permission, call it after the ATT callback so an authorized
  IDFA can be captured.

For a new integration, verify events on the Appstack **SDK** page before enabling
downstream ad-network integrations. For a review, report only issues present in
the app; the review reference is a checklist, not a mandate to add every feature.
