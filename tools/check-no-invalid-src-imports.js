#!/usr/bin/env node
// Fails if there is any "../src/" import inside functions/src
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");
const offenders = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".ts")) checkFile(full);
  }
}

function checkFile(file) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("../src/")) {
    offenders.push(file.replace(path.join(__dirname, "..") + path.sep, ""));
  }
}

walk(ROOT);

if (offenders.length) {
  console.error("Invalid ../src/ imports found:");
  offenders.forEach((f) => console.error(" - " + f));
  process.exit(1);
}
