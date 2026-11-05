import Link from "next/link";
import { Suspense } from "react";
import { BrandMark } from "./BrandMark";
import { StudioNavigation } from "./StudioNavigation";
import { currentUser } from "@/lib/supabase/user";
import { AuthControls } from "./AuthControls";
import { getProfile } from "@/lib/supabase/profile";
import { ProfileBadge } from "./ProfileBadge";

export async function LabHeader() {
  const user = await currentUser();
  const profile = user ? await getProfile().catch(() => null) : null;
  return (
    <header className="lab-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Link href="/" className="brand" aria-label="Punnett Selection home">
        <span className="brand-mark" aria-hidden="true">
          <BrandMark />
        </span>
        <span>
          Punnett
          <span className="brand-subtitle">AI captions</span>
        </span>
      </Link>
      <div className="lab-header-tools">
        <Suspense fallback={<nav className="lab-nav" aria-label="Main"><Link href="/">Create</Link><Link href="/?mode=duel">Vote</Link></nav>}><StudioNavigation signedIn={Boolean(user)} /></Suspense>
        <AuthControls signedIn={Boolean(user)} />
        {user ? <ProfileBadge name={profile?.first_name?.trim() || "Your profile"} photo={profile?.avatar_path ? `/profile/photo?v=${encodeURIComponent(profile.updated_at)}` : null} /> : null}
      </div>
    </header>
  );
}
