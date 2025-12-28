/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const WEB_ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(WEB_ROOT, rel), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mustInclude(content, needle, file) {
  assert(
    content.includes(needle),
    `[test:headers] Esperado encontrar ${JSON.stringify(needle)} em ${file}`,
  );
}

function mustNotMatch(content, re, file, message) {
  assert(!re.test(content), `[test:headers] ${message} (${file})`);
}

try {
  const apiTs = read("src/services/api.ts");
  mustNotMatch(
    apiTs,
    /\bAuthorization\s*:\s*([`'"])\s*Bearer\b/i,
    "src/services/api.ts",
    "Não deve setar Authorization: Bearer no axios interceptor",
  );
  mustInclude(apiTs, 'headers["x-id-token"]', "src/services/api.ts");
  mustInclude(apiTs, 'headers["x-tenant-id"]', "src/services/api.ts");
  mustInclude(apiTs, "delete headers.Authorization", "src/services/api.ts");

  const authorizedFetchTs = read("src/services/authorizedFetch.ts");
  mustNotMatch(
    authorizedFetchTs,
    /headers\.(set|append)\(\s*["']Authorization["']\s*,\s*([`'"])\s*Bearer\b/i,
    "src/services/authorizedFetch.ts",
    "Não deve setar Authorization: Bearer no authorizedFetch",
  );
  mustInclude(authorizedFetchTs, 'headers.set("x-id-token"', "src/services/authorizedFetch.ts");
  mustInclude(authorizedFetchTs, 'headers.set("x-tenant-id"', "src/services/authorizedFetch.ts");
  mustInclude(authorizedFetchTs, 'headers.delete("Authorization")', "src/services/authorizedFetch.ts");

  const libApiTs = read("src/lib/api.ts");
  mustInclude(libApiTs, 'headers.set("x-id-token"', "src/lib/api.ts");
  mustInclude(libApiTs, 'headers.set("x-tenant-id"', "src/lib/api.ts");
  mustInclude(libApiTs, 'headers.delete("Authorization")', "src/lib/api.ts");

  console.log("[test:headers] OK");
} catch (e) {
  console.error(String(e?.message || e));
  process.exit(1);
}

