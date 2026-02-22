// functions/src/lib/logger.ts
// Structured logger for Cloud Functions.
// Outputs JSON in production for Cloud Logging compatibility,
// and human-readable format in development.

type Fields = Record<string, unknown>;
type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const isProduction = process.env.NODE_ENV === "production" || !!process.env.K_SERVICE;

interface StructuredLog {
  severity: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function buildEntry(level: LogLevel, event: string, fields?: Fields): StructuredLog {
  return {
    severity: level,
    message: event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
}

function formatDev(level: LogLevel, event: string, fields?: Fields): string {
  const ts = new Date().toISOString().slice(11, 23);
  const fieldsStr = fields && Object.keys(fields).length > 0
    ? " " + JSON.stringify(fields)
    : "";
  return `[${ts}] [${level}] ${event}${fieldsStr}`;
}

export const logger = {
  info(event: string, fields?: Fields) {
    if (isProduction) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(buildEntry("INFO", event, fields)));
    } else {
      // eslint-disable-next-line no-console
      console.log(formatDev("INFO", event, fields));
    }
  },

  error(event: string, fields?: Fields) {
    if (isProduction) {
      // eslint-disable-next-line no-console
      console.error(JSON.stringify(buildEntry("ERROR", event, fields)));
    } else {
      // eslint-disable-next-line no-console
      console.error(formatDev("ERROR", event, fields));
    }
  },

  warn(event: string, fields?: Fields) {
    if (isProduction) {
      // eslint-disable-next-line no-console
      console.warn(JSON.stringify(buildEntry("WARN", event, fields)));
    } else {
      // eslint-disable-next-line no-console
      console.warn(formatDev("WARN", event, fields));
    }
  },

  debug(event: string, fields?: Fields) {
    if (isProduction) return; // Suppress debug in production
    // eslint-disable-next-line no-console
    console.log(formatDev("DEBUG", event, fields));
  },

  /**
   * Create a child logger with default fields pre-attached.
   * Useful for request-scoped logging.
   *
   * @example
   * const log = logger.child({ tenantId: "abc", requestId: "xyz" });
   * log.info("Processing request");
   */
  child(defaultFields: Fields) {
    const merge = (fields?: Fields): Fields => ({ ...defaultFields, ...fields });
    return {
      info: (event: string, fields?: Fields) => logger.info(event, merge(fields)),
      error: (event: string, fields?: Fields) => logger.error(event, merge(fields)),
      warn: (event: string, fields?: Fields) => logger.warn(event, merge(fields)),
      debug: (event: string, fields?: Fields) => logger.debug(event, merge(fields)),
    };
  },
};
