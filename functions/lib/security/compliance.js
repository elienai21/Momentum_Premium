"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplianceRules = getComplianceRules;
/**
 * Returns compliance rules based on a region code (e.g., 'EU', 'BR').
 * This allows the frontend to conditionally show consent banners or link to the correct policy.
 * @param region A region identifier (e.g., 'EU', 'BR', 'US').
 * @returns A compliance rules object for that region.
 */
function getComplianceRules(region) {
    const rules = {
        'EU': {
            requireConsent: true,
            dataRetentionMonths: 12,
            privacyPolicyUrl: '/privacy/gdpr',
        },
        'BR': {
            requireConsent: true,
            dataRetentionMonths: 24,
            privacyPolicyUrl: '/privacy/lgpd',
        },
        'US': {
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
