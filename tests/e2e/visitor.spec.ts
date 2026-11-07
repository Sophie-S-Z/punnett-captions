import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 768, 1440]) {
  test(`visitor pages render without overflow or accessibility violations at ${width}px`, async ({ page }) => {
    // Each case scans three real views; optical surface contrast sampling is slower.
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/", "/?mode=duel"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(scan.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("visitors cannot open protected routes or private photos", async ({ page }) => {
  for (const path of ["/profile", "/profile/photo", "/history", "/history/created", "/history/collection", "/discover"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1")).toContainText("Create captions");
    await expect(page.getByRole("button", { name: "Sign in with Google", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  }
});

test("a malformed session cookie cannot bypass the server guard", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sb-ralfwrckxnaieamlttmm-auth-token", value: "base64-invalid", url: baseURL! }]);
  await page.goto("/history");
  await expect(page).toHaveURL(/\/$/);
});

test("failed OAuth callback offers a retry instead of failing the page", async ({ page }) => {
  await page.goto("/auth/callback?error=access_denied");
  await expect(page).toHaveURL(/\/\?auth=failed$/);
  await expect(page.locator("p[role=alert]")).toContainText("Sign-in did not finish");
});

test("Google sign-in requests the exact callback on the current app origin", async ({ page, baseURL }) => {
  await page.goto("/");
  const authorization = page.waitForRequest((request) => request.url().includes(".supabase.co/auth/v1/authorize"));
  await page.getByRole("button", { name: "Sign in with Google" }).first().click();
  const request = await authorization;
  const url = new URL(request.url());
  expect(url.searchParams.get("provider")).toBe("google");
  expect(url.searchParams.get("redirect_to")).toBe(new URL("/auth/callback", baseURL).toString());
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
});
