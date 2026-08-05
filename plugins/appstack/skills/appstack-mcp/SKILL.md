---
name: appstack-mcp
description: >-
  Best practices for using the Appstack Analytics MCP connector efficiently —
  correct tool call order, exact Cube measure/dimension naming conventions,
  and how to resolve a company name to app scope. Use whenever connected to
  the Appstack MCP server and asked for attribution/analytics data, ad spend,
  installs, revenue, integrations status, onboarding progress, dashboards,
  user journeys, or to create/manage standard links.
---

# Using the Appstack Analytics MCP connector well

The Appstack MCP server exposes real attribution and analytics data — installs,
ad spend, revenue, integrations, dashboards, user journeys, and standard links.
Every tool call costs a round trip; guessing instead of discovering wastes
several of them and often fails outright. This skill exists to cut that down
to as few calls as possible.

**The one rule that matters most: never guess a measure, dimension, or filter
value. Discover it first.** A guessed measure/dimension name fails; a guessed
filter value silently returns an empty result, which looks like "no data"
rather than "wrong input" — much harder to debug after the fact.

## Always start here

Call `whoami` **first**, before anything else, in every new session. It
resolves in one call:

- Which app_id(s)/app_name(s) the connection has access to.
- Each app's own organization_id/organization_name.
- Whether this is a project-scoped credential (`scope: "project"`) or a
  platform-admin one (`scope: "all_organizations"`).

Don't call `list_dimension_values` or guess app scope from a natural-language
company name — `whoami` already has it.

### Resolving a company name (platform-admin scope only)

If asked about a specific company by name (e.g. "give me the ad spend for
Carrots") under `all_organizations` scope, call `find_organization("carrots")`
— **do not** scan `whoami`'s full app list by hand looking for a name match.
`whoami`'s app list for platform-admin scope can run into the hundreds of
apps across unrelated organizations; `find_organization` resolves a
partial, case-insensitive name match to the actual organization_id and its
apps in one call. Only fall back to scanning if `find_organization` finds
nothing and you suspect "Carrots" might actually be an app name, not a
company name.

## Never guess a Cube measure or dimension name

Before calling `query_metrics` with a measure/dimension you haven't already
confirmed exists, call `list_metrics` (schema) or `list_dimension_values`
(valid values) first — unless you already have that schema in context from
earlier in the same session, in which case reuse it instead of re-fetching.

**Concrete example of the failure mode this prevents:** the install-count
measure is `events_view.install` — **singular**, not `events_view.installs`.
A plural guess (the more natural English form) fails outright rather than
being auto-corrected. Treat every measure/dimension name as unconfirmed until
`list_metrics` has actually shown it to you, even ones that seem obvious.

Measures and dimensions confirmed to exist on `events_view` (there are more —
call `list_metrics` for the full set, this list is not exhaustive):

- Measures: `events_view.install`, `events_view.total_spend`,
  `events_view.revenue`, `events_view.trial_started`,
  `events_view.in_app_purchase`.
- Dimensions: `events_view.app_id`, `events_view.app_name`,
  `events_view.source_type` (e.g. filter `equals` `"non_organic"` for
  ad-attributed activity), `events_view.country`, `events_view.media_source`.

Cohorts (`eac_cohorts`/`core_eac_cohorts`) don't need a different tool —
they're reachable through the same `list_metrics`/`query_metrics` calls as
any other Cube view.

## Tool inventory

| Tool | Use it for | Notes |
| --- | --- | --- |
| `whoami` | App/org scope. Call first, every session. | |
| `find_organization` | Resolving a company name to app scope. | Platform-admin scope only |
| `list_metrics` | Discovering measure/dimension names before querying. | Call before guessing, not after failing |
| `list_dimension_values` | Discovering valid filter values before filtering. | Same — call before guessing |
| `query_metrics` | Actual numbers: spend, revenue, installs, ROAS, breakdowns. | |
| `list_integrations` | Whether an ad network/MMP/subscription platform is connected and its status. | |
| `get_onboarding_checklist` | Setup progress for a project. | |
| `list_dashboards` / `get_dashboard` | Saved dashboards and their widgets' configured measures/dimensions — already resolved to full `cube_name.field_name` paths, ready for `query_metrics`. | |
| `list_user_journeys` / `get_user_journey_filters` / `get_user_journey` | Per-user event timelines ("Appstack ID history"). | Call the `_filters` variant before filtering, same discover-first rule |
| `create_link` / `list_links` / `get_link` / `update_link` / `delete_link` | Standard links only (not ad-network links). | **These write real data** — confirm what you're about to create/change/delete before calling, don't chain them speculatively |

## Efficiency patterns

- **Reuse context, don't re-fetch.** If `list_metrics`'s schema or
  `whoami`'s scope is already in the conversation, use it — don't call the
  same discovery tool again "to be safe" within the same session.
- **Batch what you can reason about together.** If a request needs spend by
  media source *and* installs by country, that's two `query_metrics` calls
  with different dimensions/measures, not four separate single-purpose ones.
- **Prefer `get_dashboard` over rebuilding a query from scratch** when the
  user references an existing dashboard/report by name — its widgets already
  encode the right measures, dimensions, and filters.
- **`include_total` on `query_metrics` costs an extra backend query** — only
  set it when the row count itself matters, not by default.

## Common mistakes to avoid

- Guessing a measure name because it "sounds right" (see `install` vs.
  `installs` above) instead of calling `list_metrics`.
- Scanning `whoami`'s app list by hand to find a company name instead of
  calling `find_organization`.
- Re-calling `whoami`/`list_metrics` repeatedly in one session when the
  answer hasn't changed.
- Calling `create_link`/`update_link`/`delete_link` without confirming the
  specifics with the user first — these mutate real data, unlike every other
  tool.
- Treating an empty `query_metrics` result as "no data exists" without first
  checking whether the filter value was ever confirmed via
  `list_dimension_values` — an unrecognized value returns empty, not an error.
