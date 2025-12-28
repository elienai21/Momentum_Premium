import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { AlertEmail } from "../types";
import * as admin from "firebase-admin";

/**
 * Sends an alert email.
 * This is a mock implementation that logs to the console.
 * Replace with a real email service provider like SendGrid or Resend.
 * @param emailDetails - The subject and body of the email.
 */
export const sendAlertEmail = async (emailDetails: AlertEmail): Promise<void> => {
    const { subject, body } = emailDetails;
    // In a real application, you would integrate with an email service:
    // const sendgridApiKey = process.env.SENDGRID_API_KEY;
    // ... API call to SendGrid ...

    logger.info("Mock Email Sent", {
        to: "admin@momentum.platform",
        subject,
        body,
    });

    // For now, we resolve immediately.
    return Promise.resolve();
};

/**
 * Sends a proactive recommendation alert from the AI Advisor to the user.
 * @param userId The ID of the user to notify.
 * @param recommendations An array of recommendation strings.
 */
export async function sendAdvisorAlert(userId: string, recommendations: string[]) {
    try {
        const userRecord = await admin.auth().getUser(userId);
        const email = userRecord.email;

        if (!email) {
            logger.warn("Cannot send advisor alert: user has no email.", { userId });
            return;
        }

        const subject = "Momentum AI — Novas Recomendações Financeiras";
        const body = "Olá!\n\nNosso assistente de IA analisou suas finanças e tem algumas recomendações para você:\n\n" +
            recommendations.map(r => `• ${r}`).join("\n") +
            "\n\nAtenciosamente,\nEquipe Momentum";

        logger.info(`Sending advisor alert to ${email}`, { userId });

        // This logs the notification to Firestore. A separate trigger/service would handle the actual email sending.
        await db.collection("notifications").add({
            userId,
            email,
            subject,
            body,
            type: "ADVISOR_ALERT",
            createdAt: new Date().toISOString(),
            status: "pending",
        });
    } catch (error) {
        logger.error("Failed to send advisor alert.", { userId, error });
    }
}


