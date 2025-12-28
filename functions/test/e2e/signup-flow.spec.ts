import { test, expect } from '@playwright/test';

// Use a base URL from an environment variable for flexibility, defaulting to the Firebase emulator URL.
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5000';

test.describe('E2E: PLG Signup Flow', () => {

    /**
     * This test serves as a "smoke test" for the signup page UI.
     * It verifies that the page loads correctly and essential form elements are visible.
     * A full flow test would require mocking Firebase Authentication, which is beyond
     * the scope of this initial reliability upgrade.
     */
    test('should load the signup page and display the form correctly', async ({ page }) => {
        await page.goto(`${baseURL}/signup.html`);

        // 1. Verify the main title is visible
        await expect(page.locator('h1')).toContainText('Crie seu workspace Momentum');

        // 2. Verify form fields are present
        await expect(page.locator('#companyName')).toBeVisible();
        await expect(page.locator('#vertical')).toBeVisible();
        await expect(page.locator('#mode')).toBeVisible();
        await expect(page.locator('#consent')).toBeVisible();
        
        // 3. Verify the submit button is enabled and visible
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeVisible();
        await expect(submitButton).toBeEnabled();
        
        // 4. Verify that changing the mode shows the sheetId input
        const sheetIdContainer = page.locator('#sheet-id-container');
        await expect(sheetIdContainer).toBeHidden();
        await page.selectOption('#mode', 'import');
        await expect(sheetIdContainer).toBeVisible();
        await expect(page.locator('#sheetId')).toBeVisible();
    });
});
