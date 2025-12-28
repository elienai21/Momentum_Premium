const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const libRoot = path.join(repoRoot, "functions", "lib");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

if (!fs.existsSync(libRoot)) {
  console.error(`[alias-check] Missing build output: ${toPosix(path.relative(repoRoot, libRoot))}`);
  process.exit(1);
}

const badPatterns = [
  { re: /require\(["']src\//g, label: `require("src/` },
  { re: /\bfrom\s+["']src\//g, label: `from "src/` },
];

const jsFiles = walk(libRoot).filter((f) => f.endsWith(".js"));
const violations = [];

for (const file of jsFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const { re, label } of badPatterns) {
    if (re.test(content)) {
      violations.push({ file, label });
      break;
    }
  }
}

if (violations.length) {
  console.error("[alias-check] Found unresolved TS path aliases in functions/lib output:");
  for (const v of violations.slice(0, 50)) {
    console.error(`- ${toPosix(path.relative(repoRoot, v.file))} (${v.label})`);
  }
  if (violations.length > 50) console.error(`...and ${violations.length - 50} more`);
  process.exit(1);
}

console.log("[alias-check] OK (no require/from src/* in functions/lib)");

