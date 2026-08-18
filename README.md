# Appstack skills

AI-agent skills for [Appstack](https://appstack.tech), packaged as the `appstack`
plugin and published to Claude Code, Codex, and Cursor. Works with any agent that
reads `SKILL.md` files.

The first skill, `appstack-sdk`, teaches an assistant how to integrate and use the
**Appstack mobile attribution SDKs** the right way — Swift (iOS), Kotlin (Android),
React Native, Flutter, and Unity. It covers installation, where to initialize on each
platform, the event taxonomy (standard vs. custom events, and why custom events
should stay few), enhanced app campaigns (revenue + matching parameters), partner
integrations (Superwall, RevenueCat), what the SDK can and can't do, and
troubleshooting.

The second skill, `appstack-mcp`, teaches an assistant how to use the
**Appstack Analytics MCP connector** efficiently — the correct tool call order
(`whoami`/`find_organization` first, discover measure and dimension names
before querying instead of guessing), exact Cube naming conventions, and which
tools are read-only vs. the ones that write real data.

The third skill, `appstack-support`, teaches an assistant when an Appstack
question needs a **live call with support** versus just a message —
multi-variable setup questions or anything data-dependent warrant a call;
factual, documented, or how-to questions don't — and how to book one.

> Not sure what Appstack is? See the docs at https://docs.appstack.tech

## Install

Everything ships as one plugin, `appstack`, published to the Claude Code, Codex,
and Cursor marketplaces. Installing as a plugin keeps the skill updatable through
your agent's marketplace.

**Install once per agent you actually use.** Each section below is self-contained —
if you only use Claude Code, the Claude Code section is all you need. Within a
single agent, one install covers both its CLI and its desktop app. Any other agent
can use the manual copy at the end.

### Claude Code

**If you have the `claude` CLI** — this also covers the Code tab of Claude Desktop,
which shares the same `~/.claude` config:

```bash
claude plugin marketplace add appstack-tech/appstack-skills
claude plugin install appstack@appstack-plugins
```

Inside the CLI you can use `/plugin marketplace add appstack-tech/appstack-skills`
and `/plugin install appstack@appstack-plugins` instead, then `/reload-plugins`.

**If you only have Claude Desktop** (the app with Chat, Cowork, and Code tabs):
installing the app does *not* add a `claude` command to your terminal. Pick the
route that matches the tab you work in:

- **Chat or Cowork tab** — add the marketplace from the UI: **Customize → Plugins
  → Personal plugins → + → Add marketplace**, then sync it from this repository.
- **Code tab** — its plugin browser installs from marketplaces you already have,
  but cannot register a new one. Either install the CLI and use the commands
  above:

  ```bash
  curl -fsSL https://claude.ai/install.sh | bash
  ```

  or register the marketplace yourself in `.claude/settings.json` (project scope)
  or `~/.claude/settings.json` (all projects):

  ```json
  {
    "extraKnownMarketplaces": {
      "appstack-plugins": {
        "source": { "source": "github", "repo": "appstack-tech/appstack-skills" }
      }
    },
    "enabledPlugins": { "appstack@appstack-plugins": true }
  }
  ```

Each skill activates automatically when it's relevant — SDK integration work for
`appstack-sdk`, Appstack MCP tool calls for `appstack-mcp`, deciding whether to
book a call for `appstack-support` — or invoke one explicitly with
`/appstack:appstack-sdk`, `/appstack:appstack-mcp`, or `/appstack:appstack-support`.

Cloud sessions (claude.ai/code) don't inherit a local install — use the
`.claude/settings.json` form above so the plugin travels with the repo.

### Codex

```bash
codex plugin marketplace add appstack-tech/appstack-skills --ref main
codex plugin add appstack@appstack-plugins
```

Verify with `codex plugin list`, then start a new session. This also covers Codex
in the ChatGPT desktop app, which reads the same `~/.codex/config.toml` — its
plugin directory has no UI for adding third-party marketplaces, so the CLI step
above is required. You can also browse `/plugins` in the Codex TUI.

Signing in with an API key restricts installs to OpenAI-curated plugins, and
enterprise configs may allowlist marketplace sources.

### Using both Claude Code and Codex?

Skip this if you use one of them — that agent's section above is complete on its own.

Claude Code and Codex keep separate plugin registries (`~/.claude` vs `~/.codex`),
and neither can see the other's installs. So if you use both, install in both.
Within a single agent you only install once — its CLI and its desktop surface share
one registry.

Codex CLI 0.145.0+ can also import an existing Claude Code setup (settings, MCP
servers, plugins) with `/import`, instead of installing from scratch.

### Cursor

Cursor installs third-party marketplaces through **Team Marketplaces**, which is
admin-only and requires a Teams or Enterprise plan:

> Dashboard → Plugins → Team Marketplaces → Add Marketplace → **Import from Repo**,
> then paste this repository's GitHub URL.

Install the `appstack` plugin from that marketplace via `/plugin` in `cursor-agent`
or `/add-plugin` in the editor. Cursor has no scriptable plugin-install command
today, so this step is interactive.

If you can't use Team Marketplaces, install the skill directly with the
cross-agent [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add appstack-tech/appstack-skills -a cursor
```

### Any agent — copy the skill (no plugin tooling)

Copy the skill folder(s) you want into your project (or `~/.claude/skills/` for
all projects):

```bash
cp -r plugins/appstack/skills/appstack-sdk .claude/skills/appstack-sdk
cp -r plugins/appstack/skills/appstack-mcp .claude/skills/appstack-mcp
cp -r plugins/appstack/skills/appstack-support .claude/skills/appstack-support
```

### Downloading a zip (no git)

Each [GitHub release](https://github.com/appstack-tech/appstack-skills/releases)
has `appstack-skills.zip` attached — a directory of skill roots (`appstack-sdk/`,
`appstack-mcp/`, `appstack-support/`, each with its own `SKILL.md` at the top),
with the plugin manifests and icon left out since those only matter to the
git-based marketplaces. This is the artifact for a platform that takes a raw
skill zip upload (e.g. OpenAI's), which expects exactly one skill root or one
directory of skill roots at the top level.

## What's inside

One shared plugin fed by three marketplace catalogs (one per agent ecosystem):

```
.claude-plugin/marketplace.json          # Claude Code marketplace catalog
.agents/plugins/marketplace.json         # Codex marketplace catalog
.cursor-plugin/marketplace.json          # Cursor marketplace catalog
plugins/appstack/                        # the "appstack" plugin (umbrella; more skills can join)
├── .claude-plugin/plugin.json           # Claude Code manifest
├── .codex-plugin/plugin.json            # Codex manifest (rich interface + icon)
├── .cursor-plugin/plugin.json           # Cursor manifest
├── assets/icon.png                      # plugin icon
└── skills/
    ├── appstack-sdk/                    # the Appstack SDK skill
    │   ├── SKILL.md                     # cross-cutting best practices (always loaded)
    │   ├── agents/openai.yaml           # Codex trigger metadata
    │   └── references/
    │       ├── swift.md                 # iOS: install, init, examples, partners
    │       ├── kotlin.md                # Android
    │       ├── react-native.md          # React Native
    │       ├── flutter.md               # Flutter
    │       └── unity.md                 # Unity
    └── appstack-mcp/                    # the Appstack Analytics MCP usage skill
        └── SKILL.md                     # tool call order, Cube naming conventions
```

`appstack-sdk`'s `SKILL.md` holds the platform-agnostic rules (event taxonomy,
EACs, environments, limitations); each `references/*.md` holds that platform's
exact install/init code and examples, loaded on demand. Unity includes Project
Settings auto-initialization and EDM4U/manual Android dependency setup.

`appstack-mcp` and `appstack-support` are each a single `SKILL.md` — no
per-platform split needed, since neither is about a specific client platform.

## Contributing / updating

Edit `SKILL.md` for cross-cutting rules; edit the matching `references/*.md` for
platform-specific code. Keep the shared rules in `SKILL.md` only — don't duplicate
them into the per-platform files.

## Support

- Docs: https://docs.appstack.tech
- Email: support@appstack.tech
