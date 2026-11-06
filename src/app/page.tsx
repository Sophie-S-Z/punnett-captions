import Link from "next/link";
import { migrateCaptionImages } from "@/lib/supabase/migrateCaptionImages";
import { AppHeader } from "@/components/product/AppHeader";
import { CaptionVoting } from "@/components/product/CaptionVoting";
import { CaptionCreator } from "@/components/product/CaptionCreator";
import { AuthControls } from "@/components/product/AuthControls";
import { loadPair } from "@/lib/supabase/rating";
import { validCaptionId } from "@/lib/punnett/rating";
import { currentUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string; image?: string; mode?: string }> }) {
  const user = await currentUser();
  if (user) { await requireCompleteProfile(); await migrateCaptionImages().catch(() => undefined); }
  const params = await searchParams;
  const image = params.image && validCaptionId(params.image) ? params.image : undefined;
  const voting = params.mode === "duel" || Boolean(image);
  let pair = null;
  let error: string | undefined;
  if (voting) { try { pair = await loadPair(user?.id ?? null, image); } catch { error = "Captions could not be loaded. Please try again."; } }
  return <div className="app-shell"><AppHeader /><main id="main">
    {params.auth === "failed" ? <p role="alert" className="form-error">Sign-in did not finish. Please try again.</p> : null}
    {voting ? <CaptionVoting key={image ?? "duel"} signedIn={Boolean(user)} initialPair={pair} initialError={error} /> : <>
      <section className="caption-intro"><h1>Your camera roll.<br /><span className="annotated-text">Now with jokes.</span></h1><p className="intro">Upload a photo, a screenshot, or a selfie. Get funny captions for it. Keep the ones that land.</p></section>
      {user ? <CaptionCreator /> : <section className="caption-welcome"><p>Sign in with Google to upload an image. Add a tone or an inside joke, then compare the captions.</p><AuthControls /><Link className="text-link" href="/?mode=duel">Vote on other people’s captions</Link><p className="field-help">Uploads go to Gemini. Finished images and captions show up in public voting.</p></section>}
    </>}
  </main></div>;
}
