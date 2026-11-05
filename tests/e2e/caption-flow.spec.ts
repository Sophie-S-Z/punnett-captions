import { expect, test } from "@playwright/test";

test("the default experience explains image upload and AI captions in plain language", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main" });
  await expect(navigation.getByRole("link", { name: "Create", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("h1")).toContainText("Now with jokes.");
  await expect(page.getByRole("button", { name: "Sign in with Google" }).first()).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Discover", exact: true })).toHaveCount(0);
});

test("create and vote navigation switch between the two tools", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main" });
  await navigation.getByRole("link", { name: "Vote", exact: true }).click();
  await expect(page).toHaveURL(/mode=duel/);
  await expect(page.getByRole("heading", { name: "Which caption is funnier?" })).toBeVisible();
  await navigation.getByRole("link", { name: "Create", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toContainText("Now with jokes.");
});

 test("the original icon is served and global navigation follows the current tool", async ({ page, request }) => {
  for (const path of ["/favicon.ico", "/icon.svg", "/apple-icon.png"]) {
    const icon = await request.get(path);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toMatch(/image/);
  }
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main" });
  await expect(navigation.getByRole("link", { name: "Create", exact: true })).toHaveAttribute("aria-current", "page");
  await navigation.getByRole("link", { name: "Vote", exact: true }).click();
  await expect(navigation.getByRole("link", { name: "Vote", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("link", { name: "Create", exact: true })).not.toHaveAttribute("aria-current", "page");
});
