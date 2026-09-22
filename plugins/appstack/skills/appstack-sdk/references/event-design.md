# Event design, revenue, and matching parameters

Read [SKILL.md](../SKILL.md) for platform and version routing. Use the platform
reference for the actual `sendEvent` signature; these rules describe which
events and parameters to send.

## Standard and custom events

Standard `EventType` values map to ad-network optimization events. Prefer one
when it represents the action:

- Account: `LOGIN`, `SIGN_UP`, `REGISTER`
- Monetization: `PURCHASE`, `ADD_TO_CART`, `ADD_TO_WISHLIST`,
  `INITIATE_CHECKOUT`, `START_TRIAL`, `SUBSCRIBE`
- Games: `LEVEL_START`, `LEVEL_COMPLETE`
- Engagement: `TUTORIAL_COMPLETE`, `SEARCH`, `VIEW_ITEM`, `VIEW_CONTENT`, `SHARE`

The enum casing differs by platform. Swift, Kotlin, Flutter, and Unity send a
custom event with the `CUSTOM` event type plus a separate name. React Native
3.x sends the custom name as the event argument; it rejects literal `CUSTOM`.
`INSTALL` is recorded automatically on initialization.

Keep custom events to a handful of genuinely app-specific signals. Fewer than
about 10 distinct names is a review guideline, not an SDK limit. If a taxonomy
has many custom events, first look for standard-event equivalents and
near-duplicates (`buy`, `bought`, `purchase_done` → `PURCHASE`). Custom events
are not universally usable for campaign optimization; TikTok optimization uses
standard events. Use consistent, descriptive `snake_case` names for the custom
events that remain. Broad screen or tap analytics belongs in a product-analytics
tool.

## Names and parameters

Event names are identifiers, not payloads. Put personal data, item IDs, prices,
and level numbers in parameters rather than making a new event name per value.
For example, use `LEVEL_COMPLETE` with a `level` parameter instead of
`level_47_complete`.

Parameters must serialize to JSON: strings, finite numbers, booleans, and
nested arrays or objects of those values. Convert dates to `YYYY-MM-DD` or an
epoch number; convert URLs and other native objects to strings. Depending on
platform and SDK version, unsupported values may be dropped or crash the host
app. Check computed revenue with a finite-number test before attaching it:
`price * quantity` can yield `NaN`, and `total / count` can yield `Infinity`.
Omit a non-finite value rather than sending it.

## Revenue and enhanced app campaigns

For an SDK event representing revenue (`PURCHASE`, `SUBSCRIBE`, `START_TRIAL`,
and similar events), send numeric `revenue` or `price` and a string `currency`
such as `USD`. Revenue ranges are configured in Appstack and synchronized
automatically. When RevenueCat or Superwall is connected, Appstack prefers its
purchase, subscription, trial, and renewal data over equivalent SDK events.
See [partner integrations](partner-integrations.md) for the attribution wiring
and dashboard implications.

To improve matching on Meta and TikTok, send available `email`, `name` (first
and last together), `phone_number` (`phone` / `phoneNumber`), `date_of_birth`
(`birthdate` / `birthday` / `dateOfBirth`, formatted `YYYY-MM-DD`), and `gender`.
Appstack encrypts these before matching. Send the fields the app has on one
`user_attributes` custom event after sign-up or login, once per user. Appstack
stores them against the install and applies them to following events. Send again
only if a value changes; do not repeat them each session or on each revenue
event. This also works when revenue is reported by RevenueCat or Superwall.
