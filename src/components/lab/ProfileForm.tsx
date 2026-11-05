"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/profile/actions";
import type { Profile } from "@/lib/punnett/profile";

const initial: ProfileFormState = { status: "idle", message: "" };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, initial);
  return <form action={action} className="profile-form" aria-busy={pending}>
    <fieldset disabled={pending}>
      <legend className="sr-only">Your profile</legend>
      <div className="profile-photo-row">
        {profile.avatar_path ? <Image src={`/profile/photo?v=${encodeURIComponent(profile.updated_at)}`} unoptimized width={96} height={96} alt="Your profile photo" className="profile-photo" /> : <div className="profile-photo profile-initial" aria-label="No profile photo">p.</div>}
        <div><label htmlFor="photo">Profile photo <span className="field-optional">(optional)</span></label><input type="file" name="photo" id="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" /><p id="photo-help" className="field-help">JPEG, PNG, or WebP. Up to 2 MB and 4096 × 4096 pixels. Your photo is private.</p></div>
      </div>
      <div className="profile-name-grid"><div><label htmlFor="first_name">First name</label><input name="first_name" id="first_name" required maxLength={100} autoComplete="given-name" defaultValue={state.firstName ?? profile.first_name ?? ""} /></div>
      <div><label htmlFor="last_name">Last name</label><input name="last_name" id="last_name" required maxLength={100} autoComplete="family-name" defaultValue={state.lastName ?? profile.last_name ?? ""} /></div></div>
      <button type="submit" className="lab-button">{pending ? "Saving…" : "Save profile"}</button>
    </fieldset>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "form-error" : "form-success"}>{state.message}</p> : null}
    {state.status === "success" ? <Link className="text-link" href="/lab/notebook">Open your caption history</Link> : null}
  </form>;
}
