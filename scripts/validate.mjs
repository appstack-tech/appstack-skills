#!/usr/bin/env node
// Zero-dependency structural validator for the appstack-skills repo.
// Run: node scripts/validate.mjs
// Exits non-zero if any check fails, so it's CI-able.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const ok = (m) => console.log("  \x1b[32mok\x1b[0m   " + m);
const bad = (m) => {
  console.log("  \x1b[31mFAIL\x1b[0m " + m);
  failures++;
};

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const isDir = (rel) => existsSync(join(ROOT, rel)) && statSync(join(ROOT, rel)).isDirectory();

// The three marketplace catalogs, one per agent ecosystem.
const MARKETPLACES = [
  { file: ".claude-plugin/marketplace.json", kind: "claude" },
  { file: ".agents/plugins/marketplace.json", kind: "codex" },
  { file: ".cursor-plugin/marketplace.json", kind: "cursor" },
];

// Per-ecosystem plugin manifest locations, relative to a plugin dir.
const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
];

console.log("Validating appstack-skills at " + ROOT + "\n");

// --- 1. Marketplace catalogs parse and reference real plugin dirs ---
console.log("Marketplace catalogs");
const referencedPlugins = new Set();
for (const { file, kind } of MARKETPLACES) {
  if (!existsSync(join(ROOT, file))) {
    bad(`${file} is missing`);
    continue;
  }
  let mp;
  try {
    mp = readJson(file);
    ok(`parses: ${file}`);
  } catch (e) {
    bad(`parse ${file}: ${e.message}`);
    continue;
  }
  for (const p of mp.plugins ?? []) {
    // Codex uses an object source ({source:"local", path}); others use a string.
    const path = typeof p.source === "string" ? p.source : p.source?.path;
    if (!path) {
      bad(`${file}: plugin "${p.name}" has no source path`);
      continue;
    }
    if (!isDir(path)) bad(`${file}: source "${path}" is not a directory`);
    referencedPlugins.add(path.replace(/^\.\//, ""));
    if (kind === "codex") {
      const s = p.source;
      if (s?.source !== "local") bad(`${file}: "${p.name}" source.source must be "local"`);
      if (!p.policy?.installation || !p.policy?.authentication)
        bad(`${file}: "${p.name}" missing policy.installation/authentication`);
      if (!p.category) bad(`${file}: "${p.name}" missing category`);
    }
    if (kind === "cursor" && !mp.metadata?.version)
      bad(`${file}: missing metadata.version`);
  }
}

// --- 2. Each referenced plugin: manifests present, names match, version locked ---
for (const pluginPath of referencedPlugins) {
  console.log(`\nPlugin: ${pluginPath}`);
  const names = new Set();
  const versions = new Set();
  for (const rel of MANIFESTS) {
    const manifest = join(pluginPath, rel);
    if (!existsSync(join(ROOT, manifest))) {
      bad(`missing manifest: ${manifest}`);
      continue;
    }
    let m;
    try {
      m = readJson(manifest);
      ok(`parses: ${manifest}`);
    } catch (e) {
      bad(`parse ${manifest}: ${e.message}`);
      continue;
    }
    if (m.name) names.add(m.name);
    else bad(`${manifest}: missing name`);
    if (m.version) versions.add(m.version);
    else bad(`${manifest}: missing version`);
  }
  const expectedName = pluginPath.split("/").pop();
  if (names.size === 1 && names.has(expectedName))
    ok(`name consistent across manifests: "${expectedName}"`);
  else bad(`manifest names inconsistent or != dir: ${[...names].join(", ")} (dir "${expectedName}")`);
  if (versions.size === 1) ok(`version locked: ${[...versions][0]}`);
  else bad(`version mismatch across manifests: ${[...versions].join(", ")}`);

  // Codex interface constraints (per Codex plugin.json spec) + asset existence.
  try {
    const iface = readJson(join(pluginPath, ".codex-plugin/plugin.json")).interface ?? {};
    const prompts = iface.defaultPrompt ?? [];
    if (prompts.length > 3) bad(`codex interface.defaultPrompt has ${prompts.length} entries (max 3)`);
    else ok(`codex interface.defaultPrompt count ok (${prompts.length}/3)`);
    for (const p of prompts) {
      if (p.length > 128) bad(`defaultPrompt over 128 chars (${p.length}): "${p.slice(0, 40)}…"`);
    }
    if (iface.screenshots && iface.screenshots.length > 3)
      bad(`codex interface.screenshots has ${iface.screenshots.length} entries (max 3)`);
    if (iface.brandColor && !/^#[0-9A-Fa-f]{6}$/.test(iface.brandColor))
      bad(`codex interface.brandColor "${iface.brandColor}" is not a 6-digit hex color`);
    for (const key of ["composerIcon", "logo", "logoDark", "screenshots"]) {
      const vals = Array.isArray(iface[key]) ? iface[key] : iface[key] ? [iface[key]] : [];
      for (const v of vals) {
        const assetPath = join(pluginPath, v.replace(/^\.\//, ""));
        if (existsSync(join(ROOT, assetPath))) ok(`asset exists: ${key} -> ${assetPath}`);
        else bad(`asset missing: ${key} -> ${assetPath}`);
      }
    }
  } catch {
    /* no codex manifest already reported above */
  }

  // --- 3. Skills under the plugin: SKILL.md frontmatter + Codex trigger ---
  const skillsDir = join(pluginPath, "skills");
  if (!isDir(skillsDir)) {
    bad(`no skills/ dir under ${pluginPath}`);
    continue;
  }
  for (const entry of readdirSync(join(ROOT, skillsDir))) {
    if (!isDir(join(skillsDir, entry))) continue;
    const skillMd = join(skillsDir, entry, "SKILL.md");
    if (!existsSync(join(ROOT, skillMd))) {
      bad(`skill "${entry}" has no SKILL.md`);
      continue;
    }
    const txt = readFileSync(join(ROOT, skillMd), "utf8");
    const fm = txt.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      bad(`${skillMd}: no YAML frontmatter`);
      continue;
    }
    const nameM = fm[1].match(/^name:\s*(\S+)/m);
    if (!nameM) bad(`${skillMd}: missing name`);
    else if (nameM[1] !== entry) bad(`${skillMd}: name "${nameM[1]}" != folder "${entry}"`);
    else ok(`skill "${entry}": SKILL.md name matches folder`);
    if (!/^description:/m.test(fm[1])) bad(`${skillMd}: missing description`);
    if (!existsSync(join(ROOT, skillsDir, entry, "agents/openai.yaml")))
      bad(`skill "${entry}": missing agents/openai.yaml (Codex trigger)`);
    else ok(`skill "${entry}": Codex trigger present`);
  }
}

console.log("");
if (failures) {
  console.log(`\x1b[31m✖ ${failures} check(s) failed\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32m✔ All checks passed\x1b[0m");
