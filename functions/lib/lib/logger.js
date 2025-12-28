"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function stamp(fields) {
    try {
        return JSON.stringify(fields ?? {});
    }
    catch {
        return String(fields);
    }
}
exports.logger = {
    info(event, fields) {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${event} ${stamp(fields)}`);
    },
    error(event, fields) {
        // eslint-disable-next-line no-console
        console.error(`[ERROR] ${event} ${stamp(fields)}`);
    },
    warn(event, fields) {
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${event} ${stamp(fields)}`);
    },
};
