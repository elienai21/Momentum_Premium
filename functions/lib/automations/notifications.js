"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAlertEmail = void 0;
exports.sendAdvisorAlert = sendAdvisorAlert;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../utils/logger");
const admin = __importStar(require("firebase-admin"));
/**
 * Sends an alert email.
 * This is a mock implementation that logs to the console.
 * Replace with a real email service provider like SendGrid or Resend.
 * @param emailDetails - The subject and body of the email.
 */
const sendAlertEmail = async (emailDetails) => {
    const { subject, body } = emailDetails;
    // In a real application, you would integrate with an email service:
    // const sendgridApiKey = process.env.SENDGRID_API_KEY;
    // ... API call to SendGrid ...
    logger_1.logger.info("Mock Email Sent", {
        to: "admin@momentum.platform",
        subject,
        body,
    });
    // For now, we resolve immediately.
    return Promise.resolve();
};
exports.sendAlertEmail = sendAlertEmail;
/**
 * Sends a proactive recommendation alert from the AI Advisor to the user.
 * @param userId The ID of the user to notify.
 * @param recommendations An array of recommendation strings.
 */
async function sendAdvisorAlert(userId, recommendations) {
    try {
        const userRecord = await admin.auth().getUser(userId);
        const email = userRecord.email;
        if (!email) {
            logger_1.logger.warn("Cannot send advisor alert: user has no email.", { userId });
            return;
        }
        const subject = "Momentum AI — Novas Recomendações Financeiras";
        const body = "Olá!\n\nNosso assistente de IA analisou suas finanças e tem algumas recomendações para você:\n\n" +
            recommendations.map(r => `• ${r}`).join("\n") +
            "\n\nAtenciosamente,\nEquipe Momentum";
        logger_1.logger.info(`Sending advisor alert to ${email}`, { userId });
        // This logs the notification to Firestore. A separate trigger/service would handle the actual email sending.
        await firebase_1.db.collection("notifications").add({
            userId,
            email,
            subject,
            body,
            type: "ADVISOR_ALERT",
            createdAt: new Date().toISOString(),
            status: "pending",
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to send advisor alert.", { userId, error });
    }
}
