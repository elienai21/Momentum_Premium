/* eslint-disable no-console */
import * as admin from "firebase-admin";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";

type BackfillConfig = {
  dryRun: boolean;
  apply: boolean;
  tenantId?: string;
  limitTenants: number;
  limitMembers: number;
  fetchAuthEmail: boolean;
};

type Counters = {
  scannedTenants: number;
  updatedTenants: number;
  scannedMembers: number;
  updatedMembers: number;
  errors: number;
  authLookups: number;
  authFailures: number;
};

const EXAMPLE_LOG_LIMIT = 20;
const PLAN_ALLOWLIST = new Set(["starter", "pro", "premium", "enterprise"]);
const tenantDocsCache = new Map<string, boolean>();

function parseArgs(): BackfillConfig {
  const argv = process.argv.slice(2);
  const getFlag = (name: string) =>
    argv.some((a) => a === `--${name}` || a === `--${name}=true`);
  const getValue = (name: string) => {
    const match = argv.find((a) => a.startsWith(`--${name}=`));
    return match ? match.split("=")[1] : undefined;
  };

  const apply = getFlag("apply") || process.env.APPLY === "true";
  const tenantId = getValue("tenant") || process.env.TENANT_ID;
  const limitTenants =
    Number(getValue("limit-tenants") || process.env.LIMIT_TENANTS || process.env.LIMIT || "500") || 500;
  const limitMembers =
    Number(getValue("limit-members") || process.env.LIMIT_MEMBERS_PER_TENANT || "500") || 500;
  const fetchAuthEmail =
    getFlag("fetch-auth-email") || process.env.FETCH_AUTH_EMAIL === "true";

  return {
    dryRun: !apply,
    apply,
    tenantId,
    limitTenants,
    limitMembers,
    fetchAuthEmail,
  };
}

function initFirebase(): Firestore {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return getFirestore();
}

async function backfill() {
  const cfg = parseArgs();
  console.log("[START] backfillTenantsAndMembers", cfg);
  const db = initFirebase();

  const counters: Counters = {
    scannedTenants: 0,
    updatedTenants: 0,
    scannedMembers: 0,
    updatedMembers: 0,
    errors: 0,
    authLookups: 0,
    authFailures: 0,
  };

  const exampleChanges: Array<Record<string, any>> = [];

  try {
    let tenantQuery = db.collection("tenants").orderBy(admin.firestore.FieldPath.documentId());
    if (cfg.tenantId) {
      tenantQuery = tenantQuery.where(admin.firestore.FieldPath.documentId(), "==", cfg.tenantId);
    }
    tenantQuery = tenantQuery.limit(cfg.limitTenants);

    const tenantSnap = await tenantQuery.get();
    for (const tenantDoc of tenantSnap.docs) {
      counters.scannedTenants += 1;
      const tenantId = tenantDoc.id;
      const data = tenantDoc.data() || {};
      const plan = data.plan;
      const planId = data.planId;

      const tenantUpdates: Record<string, any> = {};
      if (!plan && planId) {
        tenantUpdates.plan = planId;
      } else if (!planId && plan) {
        const planDocExists =
          PLAN_ALLOWLIST.has(String(plan).toLowerCase()) ||
          (tenantDocsCache.has(plan)
            ? tenantDocsCache.get(plan)!
            : (await db.doc(`plans/${plan}`).get()).exists);

        tenantDocsCache.set(plan, planDocExists);

        if (planDocExists) {
          tenantUpdates.planId = plan;
        } else {
          console.warn("[WARN] plan not in allowlist/collection, skipping planId mirror", {
            tenantId,
            plan,
          });
        }
      } else if (plan && planId && plan !== planId) {
        console.warn("[WARN] plan diverge, no change", { tenantId, plan, planId });
      }

      if (Object.keys(tenantUpdates).length) {
        tenantUpdates.updatedAt = FieldValue.serverTimestamp();
        counters.updatedTenants += 1;
        if (exampleChanges.length < EXAMPLE_LOG_LIMIT) {
          exampleChanges.push({ tenantId, tenantUpdates });
        }
        if (!cfg.dryRun) {
          await tenantDoc.ref.set(tenantUpdates, { merge: true });
        }
      }

      // Members pass
      const membersSnap = await db
        .collection(`tenants/${tenantId}/members`)
        .limit(cfg.limitMembers)
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const memberDoc of membersSnap.docs) {
        counters.scannedMembers += 1;
        const memberData = memberDoc.data() || {};
        const updates: Record<string, any> = {};

        const isOwner = data.ownerUid && memberDoc.id === data.ownerUid;
        const isAdmin = memberData.role === "admin";

        if (!memberData.status) {
          if (isOwner || isAdmin) {
            if (data.ownerUid) {
              updates.status = "active";
            } else {
              console.warn("[INFO] ownerUid missing, not auto-activating member", {
                tenantId,
                memberId: memberDoc.id,
              });
            }
          }
        }

        if (!memberData.email && cfg.fetchAuthEmail) {
          try {
            counters.authLookups += 1;
            const userRecord = await admin.auth().getUser(memberDoc.id);
            if (userRecord.email) {
              updates.email = userRecord.email;
            }
          } catch (err: any) {
            counters.authFailures += 1;
            console.warn("[WARN] fetchAuthEmail failed", {
              tenantId,
              uid: memberDoc.id,
              error: err?.message,
            });
          }
        }

        if (Object.keys(updates).length) {
          updates.updatedAt = FieldValue.serverTimestamp();
          batch.set(memberDoc.ref, updates, { merge: true });
          batchCount += 1;
          counters.updatedMembers += 1;
          if (exampleChanges.length < EXAMPLE_LOG_LIMIT) {
            exampleChanges.push({ tenantId, memberId: memberDoc.id, updates });
          }
        }
      }

      if (!cfg.dryRun && batchCount > 0) {
        await batch.commit();
      }
    }
  } catch (err: any) {
    counters.errors += 1;
    console.error("[ERROR] backfill failed", err?.message || err);
    process.exitCode = 1;
  }

  console.log("[SUMMARY]", counters);
  console.log("[EXAMPLES]", exampleChanges.slice(0, EXAMPLE_LOG_LIMIT));
  console.log(cfg.dryRun ? "[DONE] DRY RUN (no writes performed)" : "[DONE] APPLY mode (writes applied)");
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
