# Appstack skills

AI-agent skills for [Appstack](https://appstack.tech), packaged as the `appstack`
plugin and published to Claude Code, Codex, and Cursor. Works with any agent that
reads `SKILL.md` files.

The first skill, `appstack-sdk`, teaches an assistant how to integrate and use the
**Appstack mobile attribution SDKs** the right way — Swift (iOS), Kotlin (Android),
React Native, and Flutter. It covers installation, where to initialize on each
platform, the event taxonomy (standard vs. custom events, and why custom events
should stay few), enhanced app campaigns (revenue + matching parameters), partner
integrations (Superwall, RevenueCat), what the SDK can and can't do, and
troubleshooting.

> Not sure what Appstack is? See the docs at https://docs.appstack.tech

## Install

Everything ships as one plugin, `appstack`, published to the Claude Code, Codex,
and Cursor marketplaces. Installing as a plugin keeps the skill updatable through
your agent's marketplace. Any other agent can use the manual copy at the end.

### Claude Code

```bash
/plugin marketplace add appstack-tech/appstack-skills
/plugin install appstack@appstack-plugins
```

Then restart or run `/reload-plugins`. The skill activates automatically when
you're working on an Appstack SDK integration; you can also invoke it explicitly
with `/appstack:appstack-sdk`.

### Codex

```bash
codex plugin marketplace add appstack-tech/appstack-skills --ref main
```

Then open `/plugins` in Codex and install `appstack` from the Appstack marketplace.

### Cursor

Add this repository as a plugin marketplace in Cursor's plugin settings, then
install the `appstack` plugin from it. The repo ships the Cursor marketplace at
`.cursor-plugin/marketplace.json`.

### Any agent — copy the skill (no plugin tooling)

Copy the skill folder into your project (or `~/.claude/skills/` for all projects):

```bash
cp -r plugins/appstack/skills/appstack-sdk .claude/skills/appstack-sdk
```

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
    └── appstack-sdk/                    # the Appstack SDK skill
        ├── SKILL.md                     # cross-cutting best practices (always loaded)
        ├── agents/openai.yaml           # Codex trigger metadata
        └── references/
            ├── swift.md                 # iOS: install, init, examples, partners
            ├── kotlin.md                # Android
            ├── react-native.md          # React Native
            └── flutter.md               # Flutter
```

`SKILL.md` holds the platform-agnostic rules (event taxonomy, EACs, environments,
limitations). Each `references/*.md` holds that platform's exact install/init code
and examples, loaded on demand. Unity SDK is intentionally out of scope for now.

## Contributing / updating

Edit `SKILL.md` for cross-cutting rules; edit the matching `references/*.md` for
platform-specific code. Keep the shared rules in `SKILL.md` only — don't duplicate
them into the per-platform files.

## Support

- Docs: https://docs.appstack.tech
- Email: support@appstack.tech
