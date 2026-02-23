/**
 * OFX Parser for bank statement imports.
 * Parses OFX/QFX files (Open Financial Exchange) into a standardized format.
 * Supports OFX 1.x (SGML) format commonly exported by Brazilian banks.
 */

import type { ParsedTransaction, ParseResult } from "./csvParser";

interface OFXTransaction {
  TRNTYPE: string;
  DTPOSTED: string;
  TRNAMT: string;
  FITID: string;
  CHECKNUM?: string;
  MEMO?: string;
  NAME?: string;
}

/**
 * Extract a tag value from OFX SGML content.
 * OFX 1.x uses SGML tags like <TAG>value (no closing tag needed for leaf elements).
 */
function extractTag(content: string, tagName: string): string {
  // Match <TAG>value or <TAG>value</TAG>
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Parse OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
 * Common in Brazilian bank exports.
 */
function parseOFXDate(dateStr: string): string {
  if (!dateStr) return "";

  // Remove timezone info like [-3:BRT]
  const cleaned = dateStr.replace(/\[.*\]/, "").trim();

  if (cleaned.length >= 8) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

/**
 * Map OFX transaction type to credit/debit.
 */
function mapOFXType(trnType: string, amount: number): "credit" | "debit" {
  const type = trnType.toUpperCase();

  const creditTypes = ["CREDIT", "DEP", "INT", "DIV", "DIRECTDEP", "XFER"];
  const debitTypes = ["DEBIT", "CHECK", "PAYMENT", "ATM", "POS", "FEE", "SRVCHG"];

  if (creditTypes.includes(type)) return "credit";
  if (debitTypes.includes(type)) return "debit";

  // Fallback to amount sign
  return amount >= 0 ? "credit" : "debit";
}

/**
 * Map OFX transaction type to a human-readable category.
 */
function mapOFXCategory(trnType: string): string | undefined {
  const typeMap: Record<string, string> = {
    CREDIT: "Credito",
    DEBIT: "Debito",
    INT: "Juros",
    DIV: "Dividendos",
    FEE: "Taxas",
    SRVCHG: "Tarifas Bancarias",
    DEP: "Deposito",
    ATM: "Saque ATM",
    POS: "Compra",
    XFER: "Transferencia",
    CHECK: "Cheque",
    PAYMENT: "Pagamento",
    DIRECTDEP: "Deposito Direto",
    DIRECTDEBIT: "Debito Direto",
    OTHER: undefined,
  };

  return typeMap[trnType.toUpperCase()];
}

/**
 * Extract all transaction blocks from OFX content.
 */
function extractTransactionBlocks(content: string): string[] {
  const blocks: string[] = [];
  const regex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST))/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

/**
 * Parse an OFX/QFX file content into standardized transactions.
 */
export function parseOFX(content: string): ParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Basic validation
  if (!content.includes("OFXHEADER") && !content.includes("<OFX>") && !content.includes("<ofx>")) {
    return {
      transactions: [],
      errors: ["Arquivo nao parece ser um OFX valido. Verifique o formato do arquivo."],
      totalRows: 0,
      skippedRows: 0,
    };
  }

  // Extract transaction blocks
  const blocks = extractTransactionBlocks(content);

  if (blocks.length === 0) {
    return {
      transactions: [],
      errors: ["Nenhuma transacao encontrada no arquivo OFX."],
      totalRows: 0,
      skippedRows: 0,
    };
  }

  let skippedRows = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    try {
      const trnType = extractTag(block, "TRNTYPE");
      const dtPosted = extractTag(block, "DTPOSTED");
      const trnAmt = extractTag(block, "TRNAMT");
      const fitId = extractTag(block, "FITID");
      const memo = extractTag(block, "MEMO");
      const name = extractTag(block, "NAME");
      const checkNum = extractTag(block, "CHECKNUM");

      if (!dtPosted && !trnAmt) {
        errors.push(`Transacao ${i + 1}: data ou valor ausente.`);
        skippedRows++;
        continue;
      }

      const date = parseOFXDate(dtPosted);
      const amountStr = trnAmt.replace(",", ".");
      const amount = parseFloat(amountStr) || 0;
      const type = mapOFXType(trnType, amount);
      const description = name || memo || `Transacao ${trnType}`;
      const category = mapOFXCategory(trnType);

      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type,
        category,
        reference: fitId || checkNum || undefined,
      });
    } catch (err) {
      errors.push(`Transacao ${i + 1}: erro ao processar.`);
      skippedRows++;
    }
  }

  // Extract account info for context
  const bankId = extractTag(content, "BANKID");
  const acctId = extractTag(content, "ACCTID");
  if (bankId || acctId) {
    // Log context info (not an error)
    errors.unshift(
      `Conta identificada: Banco ${bankId || "N/A"}, Conta ${acctId ? "****" + acctId.slice(-4) : "N/A"}`
    );
  }

  return {
    transactions,
    errors,
    totalRows: blocks.length,
    skippedRows,
  };
}
