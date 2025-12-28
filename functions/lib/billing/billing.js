"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
exports.reportUsage = reportUsage;
const stripe_1 = __importDefault(require("stripe"));
const params_1 = require("firebase-functions/params");
const STRIPE_KEY = (0, params_1.defineSecret)('STRIPE_API_KEY');
// @ts-ignore
function getStripe() {
    return new stripe_1.default(STRIPE_KEY.value(), {
        // @ts-ignore
        apiVersion: '2024-04-10'
    });
}
async function reportUsage(subscriptionItemId, quantity) {
    const stripe = getStripe();
    const out = await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment'
    });
    return out;
}
