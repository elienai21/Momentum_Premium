import { db } from "src/services/firebase";

export interface ComplianceRules {
  requireConsent: boolean;
  dataRetentionMonths: number;
  privacyPolicyUrl: string;
}

/**
 * Returns compliance rules based on a region code (e.g., 'EU', 'BR').
 * This allows the frontend to conditionally show consent banners or link to the correct policy.
 * @param region A region identifier (e.g., 'EU', 'BR', 'US').
 * @returns A compliance rules object for that region.
 */
export function getComplianceRules(region: string): ComplianceRules {
  const rules: { [key: string]: ComplianceRules } = {
    'EU': { // GDPR
      requireConsent: true,
      dataRetentionMonths: 12,
      privacyPolicyUrl: '/privacy/gdpr',
    },
    'BR': { // LGPD
      requireConsent: true,
      dataRetentionMonths: 24,
      privacyPolicyUrl: '/privacy/lgpd',
    },
    'US': { // Default/CCPA-like
      requireConsent: false,
      dataRetentionMonths: 36,
      privacyPolicyUrl: '/privacy/default',
    },
  };

  const regionCode = region.toUpperCase();
  // Handle specific European countries to map to 'EU'
  const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
  if (euCountries.includes(regionCode)) {
      return rules['EU'];
  }

  return rules[regionCode] || rules['US'];
}



