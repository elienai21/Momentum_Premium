#!/usr/bin/env node
// Fails if any source file imports "../src/..." (invalid from within src/)
const fs = require("fs");
const path = require("path");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(path.join(process.cwd(), "src"));
const invalid = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("../src/")) {
    invalid.push(path.relative(process.cwd(), file));
  }
}

if (invalid.length > 0) {
  console.error("Found invalid imports using '../src/' inside src/:");
  invalid.forEach((f) => console.error(" -", f));
  process.exit(1);
}

console.log("No invalid '../src/' imports found.");
