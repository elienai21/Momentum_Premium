/**
 * CSV Parser for financial transaction imports.
 * Parses CSV files into a standardized transaction format.
 * Supports common Brazilian bank statement formats.
 */

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  category?: string;
  reference?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
  totalRows: number;
  skippedRows: number;
}

// Common header mappings for Brazilian bank statements
const HEADER_MAPPINGS: Record<string, string[]> = {
  date: ["data", "date", "dt", "data_transacao", "data transacao", "dt_lancamento", "data lancamento", "data_movimento"],
  description: ["descricao", "description", "desc", "historico", "lancamento", "memo", "detalhes", "nome", "estabelecimento"],
  amount: ["valor", "amount", "value", "vlr", "montante", "quantia"],
  type: ["tipo", "type", "natureza", "d/c", "dc", "sentido"],
  category: ["categoria", "category", "cat", "classificacao"],
  reference: ["referencia", "reference", "ref", "documento", "doc", "nsu"],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9_]/g, "_");
}

function mapHeader(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_MAPPINGS)) {
    if (aliases.some((alias) => normalized.includes(normalizeHeader(alias)))) {
      return field;
    }
  }
  return null;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  if (semicolonCount > commaCount) return ";";
  return ",";
}

function parseAmount(value: string): number {
  if (!value) return 0;

  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[R$\s]/g, "").trim();

  // Handle Brazilian format: 1.234,56 → 1234.56
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Check which comes last (that's the decimal separator)
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // Could be Brazilian decimal: 1234,56
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: string): string {
  if (!value) return "";

  const trimmed = value.trim();

  // DD/MM/YYYY or DD-MM-YYYY (Brazilian format)
  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // MM/DD/YYYY (US format)
  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return trimmed;
}

function inferType(amount: number, typeField?: string): "credit" | "debit" {
  if (typeField) {
    const lower = typeField.toLowerCase().trim();
    if (["c", "credit", "credito", "crédito", "entrada", "+"].includes(lower)) return "credit";
    if (["d", "debit", "debito", "débito", "saida", "saída", "-"].includes(lower)) return "debit";
  }
  return amount >= 0 ? "credit" : "debit";
}

export function parseCSV(content: string): ParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];

  // Split into lines, filter empties
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      transactions: [],
      errors: ["Arquivo CSV deve ter pelo menos um cabecalho e uma linha de dados."],
      totalRows: 0,
      skippedRows: 0,
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCSVLine(lines[0], delimiter);
  const headerMap: Record<number, string> = {};

  // Map headers to known fields
  headers.forEach((header, index) => {
    const mapped = mapHeader(header);
    if (mapped) {
      headerMap[index] = mapped;
    }
  });

  // Validate required fields
  const mappedFields = Object.values(headerMap);
  if (!mappedFields.includes("date") && !mappedFields.includes("amount")) {
    return {
      transactions: [],
      errors: [
        `Cabecalhos nao reconhecidos: ${headers.join(", ")}. ` +
        `Esperado pelo menos: Data e Valor. ` +
        `Formatos aceitos: ${HEADER_MAPPINGS.date.join(", ")} para data; ${HEADER_MAPPINGS.amount.join(", ")} para valor.`,
      ],
      totalRows: lines.length - 1,
      skippedRows: lines.length - 1,
    };
  }

  let skippedRows = 0;

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], delimiter);
    const row: Record<string, string> = {};

    fields.forEach((value, index) => {
      const field = headerMap[index];
      if (field) {
        row[field] = value;
      }
    });

    // Skip empty rows
    if (!row.date && !row.amount && !row.description) {
      skippedRows++;
      continue;
    }

    const date = parseDate(row.date || "");
    const amount = parseAmount(row.amount || "0");

    if (!date && !amount) {
      errors.push(`Linha ${i + 1}: data ou valor invalido.`);
      skippedRows++;
      continue;
    }

    const type = inferType(amount, row.type);

    transactions.push({
      date,
      description: row.description || "Sem descricao",
      amount: Math.abs(amount),
      type,
      category: row.category || undefined,
      reference: row.reference || undefined,
    });
  }

  return {
    transactions,
    errors,
    totalRows: lines.length - 1,
    skippedRows,
  };
}
