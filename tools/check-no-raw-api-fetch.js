#!/usr/bin/env node
/**
 * Fails if there are raw fetch("/api...") calls outside the allowed files.
 * Allowed: web/src/services/authorizedFetch.ts (the wrapper itself).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "web", "src");
const ALLOWLIST = new Set([
  path.join("web", "src", "services", "authorizedFetch.ts"),
]);

/** Recursively gather .ts/.tsx files */
function gather(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...gather(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

const offenders = [];
const files = gather(ROOT);
const regex = /fetch\s*\(\s*["'`]\/api/;

for (const file of files) {
  const rel = file.replace(path.join(__dirname, "..") + path.sep, "");
  if (ALLOWLIST.has(rel)) continue;

  const content = fs.readFileSync(file, "utf8");
  if (regex.test(content)) {
    offenders.push(rel);
  }
}

if (offenders.length) {
  console.error("Raw fetch(\"/api\") found outside authorized wrapper:");
  for (const f of offenders) console.error(" - " + f);
  console.error(
    'Use "api" (axios) for REST/JSON or "authorizedFetch" for streaming/FormData.'
  );
  process.exit(1);
}
