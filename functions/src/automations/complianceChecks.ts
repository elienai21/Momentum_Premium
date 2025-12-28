import { db } from "src/services/firebase";

import { logger } from "../utils/logger";

// Mock notification sender
async function sendNotification(tenantId: string, message: string) {
    logger.info("Sending notification", { tenantId, message });
    // In a real app, this would look up the tenant owner and send an email/push notification
    await db.collection(`tenants/${tenantId}/notifications`).add({
        message,
        createdAt: new Date().toISOString(),
        read: false,
    });
}

/**
 * Runs compliance and operational checks for a single tenant.
 * Intended to be called by a scheduled function.
 * @param tenantId The ID of the tenant to check.
 */
export async function runTenantChecks(tenantId: string) {
    const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        logger.warn(`Cannot run compliance check: tenant ${tenantId} not found.`);
        return;
    }
    const tenantData = tenantSnap.data()!;

    const accountsRef = tenantRef.collection("accounts");
    
    // Check for overdue accounts
    const today = new Date().toISOString().split("T")[0];
    const overdueSnap = await accountsRef
        .where("status", "==", "pending")
        .where("dueDate", "<", today)
        .get();

    if (!overdueSnap.empty) {
        // Update status to 'overdue' for these accounts
        const batch = db.batch();
        overdueSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
          batch.update(doc.ref, { status: "overdue" })
        );
        await batch.commit();
        
        await sendNotification(tenantId, `⚠️ Você tem ${overdueSnap.size} conta(s) vencida(s) aguardando pagamento.`);
    }

    // Check for items pending final approval if dual validation is enabled
    if (tenantData.features?.dualValidation) {
        const pendingApprovalSnap = await accountsRef
            .where("status", "==", "under_review")
            .get();
            
        if (!pendingApprovalSnap.empty) {
            await sendNotification(tenantId, `🔒 ${pendingApprovalSnap.size} pagamento(s) aguardam sua aprovação final.`);
        }
    }
}



