/**
 * ============================================================
 * 🔧 Firestore Import Fixer Script — Momentum (v7.9, CJS)
 * ============================================================
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve("src");
const SERVICE_FILE = "services/firebase";
const EXTENSIONS = [".ts", ".js"];

function getImportPath(filePath) {
  const depth = filePath.split(path.sep).length - SRC_DIR.split(path.sep).length - 1;
  const prefix = depth <= 0 ? "./" : "../".repeat(depth);
  return `${prefix}${SERVICE_FILE}`;
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, "utf-8");
  const original = code;

  // Ignora o arquivo base firebase.ts
  if (filePath.endsWith("services/firebase.ts")) return;

  // Remove import antigo
  code = code.replace(/import\s+\{\s*firestore\s*\}\s+from\s+["']firebase-admin["'];?/g, "");

  // Substitui chamadas firestore() → db
  code = code.replace(/\bfirestore\(\)/g, "db");

  // Remove recriação local
  code = code.replace(/const\s+db\s*=\s*firestore\(\);?/g, "");

  // Adiciona import { db } se não existir
  if (!/import\s+\{\s*db\s*\}\s+from\s+["'].*services\/firebase["'];?/.test(code)) {
    const importPath = getImportPath(filePath);
    code = `import { db } from "${importPath}";\n` + code;
  }

  if (code !== original) {
    fs.writeFileSync(filePath, code, "utf-8");
    console.log(`✅ Corrigido: ${filePath}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      processFile(fullPath);
    }
  }
}

console.log("🚀 Iniciando correção automática dos imports Firestore...");
walkDir(SRC_DIR);
console.log("✨ Correção concluída com sucesso!");
