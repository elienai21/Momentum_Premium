// functions/src/lib/logger.ts
type Fields = Record<string, unknown>;

function stamp(fields?: Fields) {
  try {
    return JSON.stringify(fields ?? {});
  } catch {
    return String(fields);
  }
}

export const logger = {
  info(event: string, fields?: Fields) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${event} ${stamp(fields)}`);
  },
  error(event: string, fields?: Fields) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${event} ${stamp(fields)}`);
  },
  warn(event: string, fields?: Fields) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${event} ${stamp(fields)}`);
  },
};
