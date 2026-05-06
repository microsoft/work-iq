import { test, expect } from "@playwright/test";

test.describe("work-iq GitHub repository", () => {
  test("homepage loads and shows repository title", async ({ page }) => {
    await page.goto("https://github.com/microsoft/work-iq");

    await expect(page).toHaveTitle(/work-iq/i);
    await expect(
      page.getByRole("heading", { name: /work-iq/i }).first()
    ).toBeVisible();
  });

  test("README is visible on the repository page", async ({ page }) => {
    await page.goto("https://github.com/microsoft/work-iq");

    const readme = page.locator("article").first();
    await expect(readme).toBeVisible();
  });
});
