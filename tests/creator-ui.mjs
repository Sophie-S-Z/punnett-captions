// Actual creator component; isolated local fixture actions, no provider/database calls.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const root = process.cwd(),
  dir = resolve(".vercel/creator-ui-harness");
async function write(p, s) {
  await mkdir(resolve(dir, p, ".."), { recursive: true });
  await writeFile(resolve(dir, p), s);
}
await write("package.json", JSON.stringify({ private: true, type: "module" }));
await write(
  "next.config.mjs",
  `export default {devIndicators:false,outputFileTracingRoot:${JSON.stringify(root)}}`,
);
await write(
  "tsconfig.json",
  JSON.stringify({
    extends: "../../tsconfig.json",
    compilerOptions: { paths: { "@/*": ["../../src/*"] } },
    include: ["**/*.tsx", "**/*.ts"],
    exclude: ["node_modules"],
  }),
);
let source = await readFile(
  "src/components/product/CaptionCreator.tsx",
  "utf8",
);
source = source.replace('"@/app/create/actions"', '"./fixture-actions"');
for (const name of ["CaptionActions", "StudioDetails", "ProgressFeedback"])
  source = source.replace(`"./${name}"`, `"@/components/product/${name}"`);
await write("CaptionCreator.tsx", source);
await write(
  "fixture-actions.ts",
  `'use server';export async function generateCaptions(form:FormData){await new Promise(r=>setTimeout(r,200));if(String(form.get('prompt')).includes('failure'))return {ok:false as const,error:'Isolated fixture failure.',stage:'generate' as const};return {ok:true as const,imageId:'00110000-0000-4000-8000-000000000001',captions:[{id:'00110000-0000-4000-8000-000000000002',imageId:'00110000-0000-4000-8000-000000000001',text:'Fixture caption one.'},{id:'00110000-0000-4000-8000-000000000003',imageId:'00110000-0000-4000-8000-000000000001',text:'Fixture caption two.'}]}}`,
);
await write(
  "app/layout.tsx",
  `export {default,metadata} from '../../../src/app/layout';`,
);
await write(
  "app/page.tsx",
  `import {CaptionCreator} from '../CaptionCreator';export default function Page(){return <div className="app-shell"><main id="main"><section className="caption-intro"><div><h1>Make the photo funnier.</h1><p>Isolated creator fixture. No provider call.</p></div></section><CaptionCreator/></main></div>}`,
);
const build = spawn(
  process.execPath,
  [resolve("node_modules/next/dist/bin/next"), "build", dir, "--webpack"],
  { cwd: root, env: process.env, stdio: "inherit" },
);
assert.equal(await new Promise((r) => build.once("exit", r)), 0);
const server = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "start",
    dir,
    "--hostname",
    "127.0.0.1",
    "--port",
    "3115",
  ],
  { cwd: root, env: process.env, stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if (
        (
          await fetch("http://127.0.0.1:3115", {
            signal: AbortSignal.timeout(5000),
          })
        ).ok
      )
        break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3115", { timeout: 90000 });
  await page.getByRole("button", { name: "Generate captions" }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Generate captions" }).isDisabled(),
    true,
  );
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.screenshot({
      path: ".vercel/creator-" + width + ".png",
      fullPage: true,
    });
  }
  const bytes = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 100;
    c.height = 80;
    c.getContext("2d").fillRect(0, 0, 100, 80);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#create-image").setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: Buffer.from(bytes, "base64"),
  });
  await page.getByLabel("Context").fill("failure");
  await page.getByRole("button", { name: "Generate captions" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Isolated fixture failure" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Generate captions" }).isEnabled(),
    true,
  );
  await page.getByLabel("Context").fill("fixture success");
  await page.getByRole("button", { name: "Generate captions" }).click();
  await page.getByRole("heading", { name: "Pick your favorite" }).waitFor();
  assert.equal(await page.locator(".result-list > li").count(), 2);
  await page.screenshot({
    path: ".vercel/creator-results.png",
    fullPage: true,
  });
  console.log(
    "PASS: actual creator empty/selected/error recovery/results and responsive accessibility. Fixture actions only.",
  );
} finally {
  await browser?.close();
  if (server.pid)
    spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
}
