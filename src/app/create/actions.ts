"use server";

import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildGenerationPrompt, geminiRequest, MAX_IMAGE_BYTES, parseGeneratedCaptions, validateUpload } from "@/lib/punnett/generation";
import type { GenerationResult, GenerationStage } from "@/lib/punnett/generation";

export async function generateCaptions(formData: FormData): Promise<GenerationResult> {
  const startedAt = Date.now();
  let providerStatus: number | null = null;
  let stage: GenerationStage = "upload";
  let generationId: string | null = null;
  let storagePath: string | null = null;
  let client: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return { ok: false, error: "Sign in to generate captions.", stage };
    const file = formData.get("image");
    if (!(file instanceof File)) return { ok: false, error: "Upload an image to generate captions.", stage };
    const validation = validateUpload(file);
    if (validation) return { ok: false, error: validation, stage };
    const promptInput = formData.get("prompt");
    if (promptInput !== null && typeof promptInput !== "string") return { ok: false, error: "Enter a text direction.", stage };
    if (typeof promptInput === "string" && promptInput.length > 1000) return { ok: false, error: "Keep your direction under 1,000 characters.", stage };
    const prompt = buildGenerationPrompt(promptInput ?? "");
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    if (!apiKey || !/^gemini-[a-z0-9.-]+$/.test(model)) return { ok: false, error: "Caption generation needs its Gemini configuration. Please contact the app owner.", stage };
    let jpeg: Buffer;
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false });
      const metadata = await image.metadata();
      if (!metadata.format || !["jpeg", "png", "webp", "gif"].includes(metadata.format)) {
        return { ok: false, error: "Choose a JPEG, PNG, WebP, or GIF image.", stage };
      }
      jpeg = await image
        .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 }).toBuffer();
    } catch {
      return { ok: false, error: "This image could not be opened. Choose a different JPEG, PNG, WebP, or GIF.", stage };
    }
    if (jpeg.length > MAX_IMAGE_BYTES) return { ok: false, error: "This image is too detailed. Choose a smaller image.", stage };
    storagePath = `${user.id}/${randomUUID()}.jpg`;
    const { error: uploadError } = await client.storage.from("caption-images").upload(storagePath, jpeg, { contentType: "image/jpeg", upsert: false });
    if (uploadError) return { ok: false, error: "Your image could not be uploaded. Please try again or contact the app owner.", stage };
    const base64 = jpeg.toString("base64");
    const { data: generation, error: createError } = await client.rpc("punnett_create_generation_v2", {
      image_path_input: storagePath, prompt_input: prompt, model_input: model,
    });
    if (createError || !generation?.id) {
      await client.storage.from("caption-images").remove([storagePath]);
      return { ok: false, error: createError?.message?.includes("daily_limit") ? "You can generate captions 10 times in 24 hours. Please try again later." : "Your image could not be saved. Please contact the app owner if this continues.", stage };
    }
    generationId = generation.id;
    stage = "generate";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(geminiRequest(prompt, base64)), signal: AbortSignal.timeout(45_000), cache: "no-store",
    });
    providerStatus = response.status;
    if (!response.ok) throw new Error(response.status === 429 ? "provider_quota" : "Generation request failed.");
    const captions = parseGeneratedCaptions(await response.json());
    stage = "save";
    const { data: completed, error: completeError } = await client.rpc("punnett_complete_generation", {
      generation_id_input: generationId, captions_input: captions,
    });
    if (completeError || !completed?.image_id || !Array.isArray(completed.captions)) throw new Error("Saving captions failed.");
    revalidatePath("/");
    revalidatePath("/");
    revalidatePath("/lab/notebook/created");
    return { ok: true, imageId: completed.image_id, captions: completed.captions };
  } catch (cause) {
    console.error("[punnett:generation-failed]", JSON.stringify({
      generationId, stage, providerStatus, durationMs: Date.now() - startedAt,
      reason: cause instanceof Error && cause.name === "TimeoutError" ? "timeout" : providerStatus === 429 ? "quota" : stage === "save" ? "persistence" : "provider_or_output",
    }));
    if (generationId && client) {
      // Cleanup is best-effort. A network failure must still produce a recoverable UI.
      try { await client.rpc("punnett_fail_generation", { generation_id_input: generationId }); } catch { /* No secrets or provider output in logs. */ }
    }
    const error = cause instanceof Error && cause.message === "provider_quota" ? "Caption generation is temporarily rate limited. Please try again later." : stage === "generate" ? "Caption generation stopped. Try another image or try again shortly. Your image may have been declined by the model." : stage === "save" ? "The captions could not be saved. Please try again." : "Caption generation is unavailable. Please try again.";
    return { ok: false, error, stage };
  }
}
