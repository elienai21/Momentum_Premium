// Simple smoke test to verify environment and basic setup
(async () => {
    console.log("Running smoke tests...");

    // Test 1: Check if essential environment variables are loaded from .env for local dev
    const hasGcloudProject = !!process.env.GCLOUD_PROJECT;
    console.log(`[SMOKE] GCLOUD_PROJECT loaded: ${hasGcloudProject ? '✅' : '❌'}`);
    if (!hasGcloudProject) {
        console.error("Error: GCLOUD_PROJECT is not set. Ensure .env is configured.");
        process.exit(1);
    }
    
    // Test 2: Check for admin sheet ID
    const hasAdminSheetId = !!process.env.ADMIN_SHEET_ID;
    console.log(`[SMOKE] ADMIN_SHEET_ID loaded: ${hasAdminSheetId ? '✅' : '❌'}`);
     if (!hasAdminSheetId) {
        console.error("Error: ADMIN_SHEET_ID is not set.");
        process.exit(1);
    }

    // Add more simple checks here in the future.
    // e.g., trying to initialize firebase-admin

    console.log("Smoke tests passed successfully! ✅");
})();
