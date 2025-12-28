import { db } from "src/services/firebase";

import { TenantInfo } from '../types';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Loads a tenant's configuration from Firestore by its ID.
 * @param tenantId The unique ID of the tenant.
 * @returns A promise that resolves to the tenant's information.
 */
export async function loadTenant(tenantId: string): Promise<TenantInfo> {
  const snap = await db.collection('tenants').doc(tenantId).get();
  if (!snap.exists) {
    throw new ApiError(404, `Tenant with ID "${tenantId}" not found.`);
  }
  return { id: snap.id, ...(snap.data() as any) };
}

/**
 * Loads a tenant's configuration from Firestore by their custom domain.
 * @param domain The custom domain associated with the tenant.
 * @returns A promise that resolves to the tenant's information or null if not found.
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
    logger.info("Attempting to find tenant by domain", { domain });
    const snap = await db.collection('tenants')
        .where('domain', '==', domain)
        .limit(1)
        .get();

    if (snap.empty) {
        logger.warn("No tenant found for domain", { domain });
        return null;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as any) };
}



