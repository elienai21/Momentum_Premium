import { db } from "src/services/firebase";


export type VerticalId = 'finance' | 'real_estate' | 'condos';
export type Currency = 'USD' | 'BRL' | 'EUR';

export interface FeatureFlags {
  [key: string]: boolean;
}

export interface TenantInfo {
  id: string;
  name: string;
  vertical: VerticalId;
  planId: string;
  theme: string;
  domain?: string;
  branding?: {
    logoPath?: string;
    primaryColor?: string;
    [key: string]: any;
  };
  features?: FeatureFlags;
  // v5.4 Fields
  locale?: string;
  currency?: Currency;
  billingStatus?: 'active' | 'trial' | 'past_due' | 'canceled' | 'trial-active' | 'trial-expired';
  trialEndsAt?: string;
  ownerEmail?: string;
  createdAt?: string;
}



