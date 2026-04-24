import { test, expect } from "@playwright/test";
import path from "node:path";

// Requires: E2E_STORAGE_STATE env pointing to a pre-authenticated storageState json,
// and a sample photo at tests/e2e/fixtures/sample-meal.jpg.
// Skips when storage state is not provided so CI without secrets stays green.

const storageState = process.env.E2E_STORAGE_STATE;

test.describe("capture → save smoke", () => {
  test.skip(!storageState, "E2E_STORAGE_STATE not set — skipping authenticated smoke test");

  test.use({ storageState: storageState ?? undefined });

  test("logged-in user can capture and save a meal in under 10s", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.locator('input[type="file"][accept^="image/"]');
    await expect(fileInput).toBeAttached();

    const start = Date.now();

    await fileInput.setInputFiles(path.resolve(__dirname, "fixtures/sample-meal.jpg"));

    await expect(page.getByText(/저장됨|저장되었어요/)).toBeVisible({ timeout: 10_000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10_000);
  });
});
