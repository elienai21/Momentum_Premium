"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleProvider = void 0;
// Concrete implementations will be injected (e.g., SendGrid, Nodemailer, Twilio, Zenvia)
// Here only the interface and a fake one for development:
class ConsoleProvider {
    async send(channel, payload) {
        console.log(`[Notify:${channel}]`, payload);
    }
}
exports.ConsoleProvider = ConsoleProvider;
