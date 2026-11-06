"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { optionalProfilePhoto, parseProfile, validateNames, validatePhoto } from "@/lib/punnett/profile";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message: string;
  firstName?: string;
  lastName?: string;
};

export async function saveProfile(_previous: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const firstName = String(form.get("first_name") ?? "").trim();
  const lastName = String(form.get("last_name") ?? "").trim();
  const fail = (message: string): ProfileFormState => ({ status: "error", message, firstName, lastName });
  const namesError = validateNames(firstName, lastName);
  if (namesError) return fail(namesError);

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return fail("Your session ended. Sign in again before saving.");
  const { data: oldData, error: oldError } = await supabase.rpc("punnett_get_profile");
  if (oldError) return fail("Your profile could not be loaded. Please try again.");
  const oldProfile = parseProfile(oldData);
  if (oldProfile.id !== auth.user.id) return fail("Your profile could not be verified.");

  let uploadedPath: string | null = null;
  let saveAttempted = false;
  try {
    const photo = optionalProfilePhoto(form.get("photo"));
    if (photo) {
      const photoError = validatePhoto(photo);
      if (photoError) return fail(photoError);
      const buffer = Buffer.from(await photo.arrayBuffer());
      let format: string;
      try {
        const image = sharp(buffer, { limitInputPixels: 16_777_216, animated: false });
        const metadata = await image.metadata();
        if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) ||
          !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 ||
          (metadata.pages ?? 1) > 1) return fail("Choose a still JPEG, PNG, or WebP photo no larger than 4096 × 4096 pixels.");
        format = metadata.format;
        await image.stats();
      } catch {
        return fail("This photo could not be read. Choose another JPEG, PNG, or WebP file.");
      }
      const mime = `image/${format}`;
      if (photo.type !== mime) return fail("The photo's contents do not match its file type. Choose another file.");
      uploadedPath = `${auth.user.id}/${randomUUID()}.${format === "jpeg" ? "jpg" : format}`;
      const { error } = await supabase.storage.from("profile-photos").upload(uploadedPath, buffer, { contentType: mime, upsert: false });
      if (error) return fail("Your photo could not be uploaded. Your profile has not changed. Please try again.");
    }

    saveAttempted = true;
    const { data, error } = await supabase.rpc("punnett_save_profile", {
      first_name_input: firstName, last_name_input: lastName, avatar_path_input: uploadedPath,
    });
    let savedData = data;
    if (error) {
      // A lost response does not mean the database rejected the write.
      // Read back before removing a photo that the row might now reference.
      const { data: readback, error: readError } = await supabase.rpc("punnett_get_profile");
      if (readError) return fail("The connection was interrupted. Reload your profile to check whether the save completed.");
      const profile = parseProfile(readback);
      if (profile.first_name !== firstName || profile.last_name !== lastName || (uploadedPath && profile.avatar_path !== uploadedPath)) {
        if (uploadedPath && profile.avatar_path !== uploadedPath) await supabase.storage.from("profile-photos").remove([uploadedPath]);
        return fail("Your profile could not be saved. Please try again.");
      }
      savedData = readback;
    }
    const saved = parseProfile(savedData);
    if (uploadedPath && oldProfile.avatar_path && oldProfile.avatar_path !== uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from("profile-photos").remove([oldProfile.avatar_path]).catch(() => ({ error: true }));
      if (cleanupError) console.error("Previous profile photo cleanup failed.");
    }
    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/history");
    return { status: "success", message: "Profile saved.", firstName: saved.first_name ?? "", lastName: saved.last_name ?? "" };
  } catch {
    if (uploadedPath && !saveAttempted) await supabase.storage.from("profile-photos").remove([uploadedPath]).catch(() => undefined);
    return fail("The connection was interrupted. Reload your profile to check whether the save completed.");
  }
}
