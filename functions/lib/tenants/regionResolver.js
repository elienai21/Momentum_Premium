"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRegion = resolveRegion;
/**
 * Resolves regional settings based on an IP address or request headers.
 * NOTE: This is a mock implementation. A production system would use a GeoIP service
 * (like MaxMind GeoIP2) or analyze headers like 'Cloudflare-IPCountry'.
 * @param ip The user's IP address (not used in this mock).
 * @param countryHeader The value from a geo-IP header like 'CF-IPCountry'.
 * @returns A configuration object with locale, currency, and a default plan.
 */
function resolveRegion(ip, countryHeader) {
    const regionMap = {
        'BR': { locale: 'pt-BR', currency: 'BRL', defaultPlan: 'starter' },
        'US': { locale: 'en-US', currency: 'USD', defaultPlan: 'premium' },
        'ES': { locale: 'es-ES', currency: 'EUR', defaultPlan: 'starter' },
        'PT': { locale: 'pt-PT', currency: 'EUR', defaultPlan: 'starter' },
        'DE': { locale: 'de-DE', currency: 'EUR', defaultPlan: 'premium' },
    };
    // Prioritize header, as it's more reliable in a cloud environment
    const regionCode = (countryHeader || 'US').toUpperCase();
    return regionMap[regionCode] || regionMap['US'];
}
