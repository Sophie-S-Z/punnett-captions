import { readFileSync } from "node:fs";
import ts from "typescript";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { MAX_IMAGE_BYTES } from "../../src/lib/punnett/generation";

declare global {
  interface Window {
    punnettPrepareUpload: (source: File) => Promise<File>;
  }
}

// Compile the application's exact utility. Canvas, decoding, and blobs run in Chrome.
const source = readFileSync(
  new URL("../../src/lib/punnett/imageUpload.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

test.beforeEach(async ({ page }) => {
  await page.setContent(
    "<!doctype html><html lang='en'><head><title>Image codec acceptance</title></head><body></body></html>",
  );
  await page.addScriptTag({
    content: `(function () {
    const exports = {};
    const require = (id) => { if (id !== './generation') throw new Error('Unexpected dependency'); return { MAX_IMAGE_BYTES: ${MAX_IMAGE_BYTES} }; };
    ${compiled}
    window.punnettPrepareUpload = exports.prepareUpload;
  })();`,
  });
});

test("a detailed camera image is resized and transported below the server image limit", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const context = canvas.getContext("2d")!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 31;
    for (let index = 0; index < pixels.data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        pixels.data[index + channel] = seed >>> 24;
      }
      pixels.data[index + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const source = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9),
    );
    const output = await window.punnettPrepareUpload(
      new File([source], "large-camera.jpg", { type: "image/jpeg" }),
    );
    const decoded = await createImageBitmap(output);
    const result = {
      sourceBytes: source.size,
      transportedBytes: output.size,
      type: output.type,
      width: decoded.width,
      height: decoded.height,
    };
    decoded.close();
    return result;
  });
  expect(result.sourceBytes).toBeGreaterThan(MAX_IMAGE_BYTES);
  expect(result.transportedBytes).toBeGreaterThan(0);
  expect(result.transportedBytes).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
  expect(result.type).toBe("image/jpeg");
  expect(result.width).toBe(1600);
  expect(result.height).toBe(1200);
});

test("corrupt image bytes reject before transport and every local object URL is released", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const created: string[] = [];
    const released: string[] = [];
    URL.createObjectURL = (object) => {
      const url = originalCreate(object);
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      released.push(url);
      originalRevoke(url);
    };
    try {
      await window.punnettPrepareUpload(
        new File(["invalid image contents"], "corrupt.png", {
          type: "image/png",
        }),
      );
      return { error: "", created, released };
    } catch (cause) {
      return {
        error: cause instanceof Error ? cause.message : String(cause),
        created,
        released,
      };
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
  expect(result.error).toContain("could not read this image");
  expect(result.created).toHaveLength(1);
  expect(result.released).toEqual(result.created);
});

const formats = [
  [
    "JPEG",
    "image/jpeg",
    () =>
      sharp({
        create: { width: 32, height: 24, channels: 3, background: "red" },
      })
        .jpeg()
        .toBuffer(),
  ],
  [
    "PNG",
    "image/png",
    () =>
      sharp({
        create: { width: 32, height: 24, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
  ],
  [
    "transparent PNG",
    "image/png",
    () =>
      sharp({
        create: {
          width: 32,
          height: 24,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer(),
  ],
  [
    "WebP",
    "image/webp",
    () =>
      sharp({
        create: { width: 32, height: 24, channels: 3, background: "red" },
      })
        .webp()
        .toBuffer(),
  ],
  [
    "transparent WebP",
    "image/webp",
    () =>
      sharp({
        create: {
          width: 32,
          height: 24,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .webp({ lossless: true })
        .toBuffer(),
  ],
  [
    "GIF",
    "image/gif",
    () =>
      sharp({
        create: { width: 32, height: 24, channels: 3, background: "red" },
      })
        .gif()
        .toBuffer(),
  ],
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
for (const [name, type, make] of formats)
  test("public browser upload prepares " + name, async ({ page }) => {
    const bytes = await make();
    const result = await page.evaluate(
      async ({ base64, type }) => {
        const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const file = await window.punnettPrepareUpload(
          new File([raw], "upload", { type }),
        );
        const image = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixel = Array.from(context.getImageData(0, 0, 1, 1).data);
        const data = {
          type: file.type,
          width: image.width,
          height: image.height,
          size: file.size,
          pixel,
        };
        image.close();
        return data;
      },
      { base64: bytes.toString("base64"), type },
    );
    expect(result.type).toBe("image/jpeg");
    expect(result.width).toBe(32);
    expect(result.height).toBe(24);
    expect(result.size).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    if (name.startsWith("transparent"))
      expect(result.pixel.slice(0, 3).every((v) => v >= 250)).toBe(true);
  });
