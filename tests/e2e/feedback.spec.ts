import { expect, test } from "@playwright/test";

test("caption voting labels show only A and B", async ({ page }) => {
  await page.goto("/?mode=duel");
  test.skip(!(await page.locator(".duel-card").count()), "Requires live caption pairs.");
  const labels = page.locator(".duel-card-meta .duel-key");
  await expect(labels).toHaveCount(2);
  expect(await labels.allTextContents()).toEqual(["A", "B"]);
  await expect(page.getByRole("region", { name: "Vote on captions", exact: true })).not.toContainText(/\b[ACGT]{4}-\d{4}\b/);
});

test("signed-in caption history contains descriptive labels instead of codes", async ({ browser }) => {
  test.skip(!process.env.PUNNETT_AUTH_STATE, "Requires an existing Google session.");
  const context = await browser.newContext({ storageState: process.env.PUNNETT_AUTH_STATE });
  try {
    const page = await context.newPage();
    for (const route of ["/lab/notebook", "/lab/notebook/created"]) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      await expect(page.locator("main")).not.toContainText(/\b[ACGT]{4}-\d{4}\b/);
    }
  } finally { await context.close(); }
});
