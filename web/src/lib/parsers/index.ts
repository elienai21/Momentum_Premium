/**
 * Unified file parser for financial data imports.
 * Supports CSV and OFX/QFX file formats.
 */

export { parseCSV } from "./csvParser";
export { parseOFX } from "./ofxParser";
export type { ParsedTransaction, ParseResult } from "./csvParser";

import { parseCSV } from "./csvParser";
import { parseOFX } from "./ofxParser";
import type { ParseResult } from "./csvParser";

/**
 * Auto-detect file type and parse accordingly.
 */
export function parseFile(content: string, filename: string): ParseResult {
  const ext = filename.toLowerCase().split(".").pop() || "";

  switch (ext) {
    case "ofx":
    case "qfx":
      return parseOFX(content);
    case "csv":
    case "txt":
    case "tsv":
      return parseCSV(content);
    default:
      // Try to auto-detect: check if it looks like OFX
      if (content.includes("OFXHEADER") || content.includes("<OFX>")) {
        return parseOFX(content);
      }
      // Default to CSV
      return parseCSV(content);
  }
}

/**
 * Read a File object and return its text content.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsText(file, "UTF-8");
  });
}
