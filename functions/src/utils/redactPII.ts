// ============================
// 🔒 PII Redaction Utility — LGPD Compliance
// ============================

/**
 * Redacts personally identifiable information (PII) from text.
 * 
 * Redacts:
 * - Email addresses
 * - Phone numbers (BR format)
 * - CPF/CNPJ (BR documents)
 * - Credit card numbers (16+ consecutive digits)
 * - UUIDs and sensitive IDs
 * 
 * Note: Does NOT redact regular financial values (amounts, totals).
 */

/**
 * Redact email addresses
 * Example: user@example.com becomes u***@e***
 */
function redactEmail(text: string): string {
    return text.replace(
        /\b([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-])[a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/g,
        (match, firstChar, firstDomain) => `${firstChar}***@${firstDomain}***`
    );
}

/**
 * Redact phone numbers (Brazilian format)
 * Example: (11) 98765-4321 becomes (**) *****-****
 */
function redactPhone(text: string): string {
    return text
        .replace(/\(\d{2}\)\s*\d{4,5}-?\d{4}/g, "(**) *****-****")
        .replace(/\b\d{10,11}\b/g, (match) => "*".repeat(match.length));
}

/**
 * Redact CPF/CNPJ (Brazilian documents)
 * Example: 123.456.789-00 becomes masked
 */
function redactDocument(text: string): string {
    return text
        .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "***.***.***.***")
        .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "**.***.***/****-**");
}

/**
 * Redact credit card numbers (16+ consecutive digits)
 * Example: 1234567812345678 becomes asterisks
 */
function redactCardNumber(text: string): string {
    return text.replace(/\b\d{16,19}\b/g, (match) => "*".repeat(match.length));
}

/**
 * Redact UUIDs and sensitive ID patterns
 * Example: 550e8400-e29b-41d4-a716-446655440000 becomes [REDACTED_UUID]
 */
function redactUUID(text: string): string {
    return text.replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        "[REDACTED_UUID]"
    );
}

/**
 * Main redaction function
 * Apply all redaction rules to the input text
 */
export function redactPII(text: string | null | undefined): string {
    if (!text || typeof text !== "string") return "";

    let redacted = text;
    redacted = redactEmail(redacted);
    redacted = redactPhone(redacted);
    redacted = redactDocument(redacted);
    redacted = redactCardNumber(redacted);
    redacted = redactUUID(redacted);

    return redacted;
}

/**
 * Redact PII from objects (deep)
 * Useful for logging request/response payloads
 */
export function redactPIIFromObject(obj: any): any {
    if (!obj || typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
        return obj.map(redactPIIFromObject);
    }

    const redacted: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === "string") {
                redacted[key] = redactPII(value);
            } else if (typeof value === "object") {
                redacted[key] = redactPIIFromObject(value);
            } else {
                redacted[key] = value;
            }
        }
    }

    return redacted;
}
