import { db } from "src/services/firebase";
import Stripe from 'stripe';
import { defineSecret } from 'firebase-functions/params';

const STRIPE_KEY = defineSecret('STRIPE_API_KEY');
// @ts-ignore
export function getStripe() {
  return new Stripe(STRIPE_KEY.value(), {
    // @ts-ignore
    apiVersion: '2024-04-10' as any });
}

export async function reportUsage(subscriptionItemId: string, quantity: number) {
  const stripe = getStripe();
  const out = await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: Math.floor(Date.now()/1000),
    action: 'increment'
  });
  return out;
}



