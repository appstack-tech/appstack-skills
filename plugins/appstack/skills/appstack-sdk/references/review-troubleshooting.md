# Review and troubleshooting

Read [SKILL.md](../SKILL.md) to choose the platform reference and check the
installed SDK version. Diagnose the reported symptom first; use this list to
check relevant causes, not to report features the app does not use.

## Missing installs or attribution

- Confirm configuration runs once with the correct platform and environment
  key. Repeating configuration cannot change the key or options; `isDebug` is
  deprecated and does not select the environment.
- Test attribution using an official-store install: App Store or TestFlight on
  iOS, Play Store on Android. Simulator or sideloaded installs may not attribute.
- Apple Ads attribution requires iOS 15+ and can take 24–48 hours to appear.
  Android attribution uses the Play Install Referrer for Play Store installs.
- Read partner attribution parameters after configuration and before the first
  paywall. On native Android, use `awaitAttributionParams()` when the initial
  match may still be running; do not require an iOS-only status key.

## Missing or unexpected events

- `INSTALL` is automatic; do not send it manually.
- Confirm the event follows configuration, the device can reach the network,
  and the event appears on the Appstack **SDK** page. Events queue offline until
  connectivity returns and transmit asynchronously.
- Check that key actions use standard event types where possible. A misspelled
  standard event can become a custom event on React Native 3.x. Review many
  custom names for duplicates and standard equivalents; see
  [event design](event-design.md).
- Check event parameters for unsupported objects, dates, `NaN`, or `Infinity`.
  Revenue events need numeric `revenue` or `price` and string `currency` when
  the SDK supplies the revenue data. A connected subscription platform takes
  precedence, so dashboard revenue can differ from SDK events.

## Integration review

- Confirm API keys are selected for the correct environment and are not
  committed directly to source. Release builds should not use verbose debug
  logging.
- For apps with a supported RevenueCat or Superwall integration, check that
  Appstack ID and attribution parameters reach the partner before offerings or
  placements load. See [partner integrations](partner-integrations.md).
- If the app has matching fields for EACs, check they are sent on
  `user_attributes` after sign-up or login, once per user or when a value
  changes, rather than on every session or revenue event.
- Guard Apple Ads calls to iOS. The wrappers have small cross-platform APIs;
  custom endpoint overrides are not supported app configuration.
- Use the platform reference's checklist for installation, call shape, and
  platform-specific requirements.
