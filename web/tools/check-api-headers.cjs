/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const WEB_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(WEB_ROOT, "src");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const allowedRawApiFetchFiles = new Set([
  "src/services/authorizedFetch.ts",
  "src/lib/api.ts",
]);

const codeFiles = walk(SRC_ROOT).filter((f) =>
  /\.(ts|tsx|js|jsx)$/.test(f),
);

const violations = [];

for (const absPath of codeFiles) {
  const rel = toPosix(path.relative(WEB_ROOT, absPath));
  const isTestFile =
    rel.includes("/__tests__/") || /\.test\./.test(rel) || /\.spec\./.test(rel);
  if (isTestFile) continue;
  const content = fs.readFileSync(absPath, "utf8");

  // Guardrail 1: nunca setar Authorization: Bearer ... para chamadas do app.
  const setsAuthorizationBearer =
    /Authorization\s*:\s*([`'"])\s*Bearer\b/i.test(content) ||
    /headers\.(set|append)\(\s*["']Authorization["']\s*,\s*([`'"])\s*Bearer\b/i.test(
      content,
    ) ||
    /headers\[\s*["']Authorization["']\s*\]\s*=\s*([`'"])\s*Bearer\b/i.test(
      content,
    ) ||
    /config\.headers\.(Authorization|authorization)\s*=\s*([`'"])\s*Bearer\b/i.test(
      content,
    );

  if (setsAuthorizationBearer) {
    violations.push({
      file: rel,
      rule: "authorization-bearer",
      message:
        "Proibido setar `Authorization: Bearer <firebaseIdToken>` no frontend. Use `x-id-token`.",
    });
  }

  // Guardrail 2: fetch("/api/...") fora do wrapper centralizado (risco de headers inconsistentes)
  const rawFetchApi = /\bfetch\(\s*([`'"])\s*\/api\//.test(content);
  if (rawFetchApi && !allowedRawApiFetchFiles.has(rel)) {
    violations.push({
      file: rel,
      rule: "raw-fetch-api",
      message:
        'Uso de `fetch("/api/...")` fora do wrapper; use `authorizedFetch`/`api`.',
    });
  }
}

if (violations.length) {
  console.error("[lint:api-headers] Guardrail falhou:");
  for (const v of violations) {
    console.error(`- ${v.file} [${v.rule}] ${v.message}`);
  }
  process.exit(1);
}

console.log("[lint:api-headers] OK");
