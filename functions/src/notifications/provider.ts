import { db } from "src/services/firebase";

export type NotifyChannel = "email" | "whatsapp";

export interface NotificationPayload {
  to: string; // email or phone with country code
  subject?: string;
  message: string;
}

export interface NotificationProvider {
  send(channel: NotifyChannel, payload: NotificationPayload): Promise<void>;
}

// Concrete implementations will be injected (e.g., SendGrid, Nodemailer, Twilio, Zenvia)
// Here only the interface and a fake one for development:

export class ConsoleProvider implements NotificationProvider {
  async send(channel: NotifyChannel, payload: NotificationPayload): Promise<void> {
    console.log(`[Notify:${channel}]`, payload);
  }
}



