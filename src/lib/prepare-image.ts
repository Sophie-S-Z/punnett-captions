import sharp from "sharp";
/** Decode every advertised input format and normalize it for private JPEG storage. */
export async function prepareImage(file: File): Promise<Buffer> {
  if (
    file.size <= 0 ||
    file.size > 8 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP, or GIF under 8 MB.");
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 40_000_000,
    animated: false,
  });
  const meta = await image.metadata();
  if (!meta.format || !["jpeg", "png", "webp", "gif"].includes(meta.format))
    throw new Error("Unsupported image content.");
  const jpeg = await image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "white" })
    .jpeg({ quality: 80 })
    .toBuffer();
  if (jpeg.length > 2 * 1024 * 1024) throw new Error("Choose a smaller image.");
  return jpeg;
}
