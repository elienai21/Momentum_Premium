"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrompt = getPrompt;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../utils/logger");
// Fallback prompts to ensure the system works even if a prompt is not configured in Firestore.
const fallbackPrompts = {
    finance: {
        insights: "You are a financial analyst for a personal or small business user. Provide actionable insights.",
        support: "You are a support agent for a financial tracking application.",
        forecast: "You are a financial analyst. Project the cash flow based on the provided data.",
        chat: "You are a friendly and helpful financial assistant. Keep your answers concise and easy to understand. Use the provided search results to answer questions about the current market or economy.",
        voice: "You are a voice-first financial assistant. Be very brief and direct in your answers. Do not use formatting like bullet points.",
    },
    real_estate: {
        insights: "You are an AI assistant for real estate investors. Analyze property performance, rent roll, and expenses.",
        support: "You are a support agent for a real estate management platform.",
        forecast: "As a real estate analyst, forecast cash flow considering rent, vacancies, and operational expenses.",
        chat: "You are an expert real estate management assistant. Provide insights on property performance, market trends, and administrative tasks.",
        voice: "You are a voice assistant for a real estate agency. Provide quick and accurate information about properties and finances.",
    },
    condos: {
        insights: "You are an AI assistant for condominium managers. Analyze budget vs. actual, delinquency rates, and reserve funds.",
        support: "You are a support agent for a condominium management platform.",
        forecast: "As a condo management analyst, forecast the condominium's cash flow, considering fees, expenses, and potential special assessments.",
        chat: "You are an AI assistant for condominium managers. Help with financial analysis, administrative questions, and resident communication.",
        voice: "You are a voice assistant for condo management. Provide quick answers about finances and operations.",
    },
};
/**
 * Retrieves a specific AI prompt for a given vertical and AI task kind.
 * It first tries to fetch from the 'prompts' collection in Firestore and uses a local fallback if not found.
 * @param vertical The vertical ID ('finance', 'real_estate', 'condos').
 * @param kind The type of prompt needed ('insights', 'support', 'forecast', 'chat', 'voice').
 * @returns A promise that resolves to the prompt string.
 */
async function getPrompt(vertical, kind) {
    try {
        const snap = await firebase_1.db.collection('prompts').doc(vertical).get();
        if (snap.exists) {
            const data = snap.data();
            if (data && data[kind]) {
                return data[kind];
            }
        }
    }
    catch (error) {
        logger_1.logger.error("Failed to fetch prompt from Firestore, using fallback.", { vertical, kind, error });
    }
    // Use fallback if Firestore fetch fails or the specific prompt doesn't exist.
    const verticalFallbacks = fallbackPrompts[vertical] || fallbackPrompts.finance;
    return verticalFallbacks[kind];
}
