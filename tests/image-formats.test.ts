import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prepareImage } from "../src/lib/prepare-image.ts";
const make = () =>
  sharp({
    create: {
      width: 32,
      height: 24,
      channels: 4,
      background: { r: 90, g: 60, b: 20, alpha: 1 },
    },
  });
const transparent = () =>
  sharp({
    create: {
      width: 32,
      height: 24,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
const cases = [
  ["JPEG", "image/jpeg", () => make().jpeg().toBuffer()],
  ["PNG", "image/png", () => make().png().toBuffer()],
  ["transparent PNG", "image/png", () => transparent().png().toBuffer()],
  ["WebP", "image/webp", () => make().webp().toBuffer()],
  [
    "transparent WebP",
    "image/webp",
    () => transparent().webp({ lossless: true }).toBuffer(),
  ],
  ["GIF", "image/gif", () => make().gif().toBuffer()],
  [
    "animated GIF",
    "image/gif",
    () =>
      sharp(
        Buffer.concat([
          Buffer.alloc(32 * 24 * 3).fill(Buffer.from([255, 0, 0])),
          Buffer.alloc(32 * 24 * 3).fill(Buffer.from([0, 0, 255])),
        ]),
        { raw: { width: 32, height: 48, channels: 3, pageHeight: 24 } },
      )
        .gif({ loop: 0, delay: [100, 100] })
        .toBuffer(),
  ],
] as const;
for (const [name, type, create] of cases)
  test(name + " decodes into one bounded JPEG", async () => {
    const bytes = await create();
    if (name === "animated GIF")
      assert.equal(
        (await sharp(bytes, { animated: true }).metadata()).pages,
        2,
      );
    const output = await prepareImage(
      new File([new Uint8Array(bytes)], "input", { type }),
    );
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 32);
    assert.equal(meta.height, 24);
    assert.equal(meta.hasAlpha, false);
    assert.ok(output.length <= 2 * 1024 * 1024);
    assert.equal(meta.exif, undefined);
    if (name.startsWith("transparent")) {
      const raw = await sharp(output).raw().toBuffer();
      assert.ok(
        raw.every((v) => v >= 250),
        "Transparent pixels should flatten onto white",
      );
    }
  });
test("orientation, dimensions and metadata normalize consistently", async () => {
  const bytes = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await prepareImage(
    new File([new Uint8Array(bytes)], "rotated.jpg", { type: "image/jpeg" }),
  );
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 1600);
  assert.equal(meta.orientation, undefined);
  assert.equal(meta.exif, undefined);
});
test("empty, oversized, unsupported and corrupt inputs are rejected", async () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"])
    await assert.rejects(() =>
      prepareImage(new File(["broken bytes"], "input", { type })),
    );
  await assert.rejects(() =>
    prepareImage(new File([], "empty.jpg", { type: "image/jpeg" })),
  );
  await assert.rejects(() =>
    prepareImage(
      new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
    ),
  );
  await assert.rejects(() =>
    prepareImage(
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'],
        "fake.png",
        { type: "image/png" },
      ),
    ),
  );
  await assert.rejects(() =>
    prepareImage(new File(["bytes"], "other.svg", { type: "image/svg+xml" })),
  );
});
