import { expect, test } from "@playwright/test";

test("anonymous direct selection requests are denied on the server", async ({ request }) => {
  const response = await request.post("/api/selection", { data: {
    winnerId: "2f896623-076b-4bd0-ad53-58b23f5f08d1",
    loserId: "76cdcd53-eb5a-4519-9565-a758d553a913",
    userId: "d5e151a0-a156-44cb-b676-36c0e503b6f0",
  } });
  expect(response.status()).toBe(401);
});

test("cross-origin selection and anonymous generation submissions are rejected", async ({ request }) => {
  const selection = await request.post("/api/selection", { headers: { origin: "https://example.org" }, data: {} });
  expect(selection.status()).toBe(403);
  const generation = await request.post("/discover", { maxRedirects: 0, form: { prompt: "Anonymous must not generate" } });
  expect(generation.status()).toBe(307);
  expect(new URL(generation.headers().location, "http://localhost:3000").pathname).toBe("/");
});

test("visitors see the voting pair and cannot judge real live captions", async ({ page }) => {
  await page.goto("/?mode=duel");
  const chamber = page.getByRole("region", { name: "Vote on captions", exact: true });
  await expect(chamber).toBeVisible();
  await expect(chamber.getByRole("heading", { name: "Which caption is funnier?" })).toBeVisible();
  const cards = chamber.locator(".duel-card");
  if (await cards.count()) {
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toBeDisabled();
    await expect(cards.nth(1)).toBeDisabled();
    await expect(chamber.getByRole("button", { name: "Skip pair", exact: true })).toBeDisabled();
    await expect(chamber.locator(".voting-glass")).toBeVisible();
    const image = chamber.locator(".duel-image img");
    await expect(image).toHaveAttribute("src", /^\/media\/[a-f0-9-]+$/);
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    let mutations = 0;
    page.on("request", request => { if (request.method() === "POST") mutations += 1; });
    await page.keyboard.press("a");
    await page.keyboard.press("b");
    await page.keyboard.press("s");
    expect(mutations).toBe(0);
  } else {
    // A real empty/error state is valid. The test never seeds simulated media.
    const error = chamber.getByRole("alert");
    if (await error.count()) await expect(error).toBeVisible();
    else await expect(chamber.getByRole("heading", { name: "No caption pairs yet." })).toBeVisible();
  }
});

test.describe("actual authenticated rating acceptance", () => {
  test.use({ storageState: process.env.PUNNETT_AUTH_STATE ?? { cookies: [], origins: [] } });
  test.skip(!process.env.PUNNETT_AUTH_STATE, "Provide an ignored Playwright storage-state file from a real Google session.");

  test("the image upload rejects corrupt image contents and releases its pending controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    const input = page.locator("#create-image");
    await expect(input).toHaveAttribute("accept", "image/*");
    const camera = page.locator(".create-camera input");
    await expect(camera).toHaveAttribute("accept", "image/*");
    await expect(camera).toHaveAttribute("capture", "environment");
    // Deliberately invalid bytes exercise validation before any model or database call.
    await input.setInputFiles({ name: "corrupt-test.png", mimeType: "image/png", buffer: Buffer.from("invalid image contents") });
    await page.getByRole("button", { name: "Generate captions" }).click();
    await expect(page.locator(".create-error")).toBeVisible();
    await expect(page.locator(".create-error")).toContainText("could not read this image");
    await expect(page.locator(".create-form")).toHaveAttribute("aria-busy", "false");
    await expect(input).toBeEnabled();
    await expect(page.getByRole("button", { name: "Generate captions" })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Generated captions" })).toHaveCount(0);
  });

  test("modified, repeated, and editing keyboard events never submit a selection", async ({ page }) => {
    await page.goto("/?mode=duel");
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    const cards = page.locator(".duel-card");
    test.skip(await cards.count() !== 2, "No real unjudged pair is available for this account.");
    await expect(cards.first()).toBeEnabled();
    let mutations = 0;
    page.on("request", request => { if (request.method() === "POST" && request.headers()["next-action"]) mutations += 1; });
    await page.keyboard.press("Shift+A");
    await page.keyboard.press("Control+B");
    await page.keyboard.press("Alt+S");
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", repeat: true, bubbles: true }));
      const input = document.createElement("input");
      input.setAttribute("aria-label", "Keyboard test field");
      document.body.append(input);
      input.focus();
    });
    await page.getByRole("textbox", { name: "Keyboard test field" }).fill("abs");
    await page.keyboard.press("a");
    await page.keyboard.press("b");
    await page.keyboard.press("s");
    expect(mutations).toBe(0);
    await expect(cards.first()).toBeEnabled();
  });

  test("a real selection persists as two opposing history entries after reload", async ({ page }) => {
    test.skip(process.env.PUNNETT_TEST_VOTES !== "1", "Set PUNNETT_TEST_VOTES=1 to authorize a real persisted test selection.");
    await page.goto("/?mode=duel");
    await expect(page.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    const cards = page.locator(".duel-card");
    test.skip(await cards.count() !== 2, "No real unjudged pair is available for this account.");
    const winnerText = (await cards.nth(0).getAttribute("aria-label"))!.replace(/^Choose caption A: /, "");
    const loserText = (await cards.nth(1).getAttribute("aria-label"))!.replace(/^Choose caption B: /, "");
    await cards.first().click();
    await expect(page.getByText("Selection saved.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Vote on captions", exact: true })).toHaveAttribute("aria-busy", "false");
    await page.goto("/history");
    await expect(page.getByText(winnerText, { exact: true })).toBeVisible();
    await expect(page.getByText(loserText, { exact: true })).toBeVisible();
    const newest = page.locator(".selection-history li");
    expect(new Set(await newest.locator("h2").allTextContents().then(texts => texts.slice(0, 2)))).toEqual(new Set([winnerText, loserText]));
    await expect(newest.filter({ has: page.getByText(winnerText, { exact: true }) }).first().locator(".eyebrow")).toContainText("Chosen");
    await expect(newest.filter({ has: page.getByText(loserText, { exact: true }) }).first().locator(".eyebrow")).toContainText("Passed");
    await page.reload();
    await expect(page.getByText(winnerText, { exact: true })).toBeVisible();
    await expect(page.getByText(loserText, { exact: true })).toBeVisible();
    await page.goto("/?mode=duel");
    await expect(page.getByRole("button",{name:`Choose caption A: ${winnerText}`,exact:true})).toHaveCount(0);
    await expect(page.getByRole("button",{name:`Choose caption B: ${loserText}`,exact:true})).toHaveCount(0);
  });
});
