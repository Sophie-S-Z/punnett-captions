import Link from "next/link";
import { CaptionGallery } from "@/components/product/CaptionGallery";
import { AppHeader } from "@/components/product/AppHeader";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { parseCreationPage, PAGE_SIZE, type CreationRecord } from "@/lib/punnett/rating";
export const dynamic = "force-dynamic";
export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser();
  await requireCompleteProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const rawPage = Number(params.page ?? 0);
  const pageIndex = Number.isSafeInteger(rawPage) && rawPage >= 0 && rawPage <= 2000 ? rawPage : 0;
  const history = await supabase.rpc("punnett_creation_history", { offset_input: pageIndex * PAGE_SIZE });
  let captions: CreationRecord[] = [];
  let hasMore = false;
  let error = Boolean(history.error);
  if (!error) { try { const page = parseCreationPage(history.data); captions = page.rows; hasMore = page.hasMore; } catch { error = true; } }
  return <div className="app-shell"><AppHeader /><main id="main" className="page-body"><section className="selection-history" aria-labelledby="history-title">
    <nav className="duel-controls" aria-label="History views"><Link className="text-link" href="/history/created" aria-current="page">Your creations</Link><Link className="text-link" href="/history" >Your votes</Link></nav><div className="page-heading"><div><h1 id="history-title">Your captions</h1><p className="intro">All your generated captions, saved with their images. Copy a punchline, download a meme, or vote on another pair.</p></div><Link className="app-button button-primary" href="/">Create captions</Link></div>
    {error ? <p className="form-error" role="alert">Your caption history could not be loaded. Reload to try again.</p> : captions.length ? <CaptionGallery captions={captions} /> : <div className="voting-empty"><h2>Your first laugh goes here.</h2><p>Upload an image and generate captions. They will stay here after you leave the page.</p><Link className="app-button" href="/">Create captions</Link></div>}
    <nav className="duel-controls" aria-label="Caption history pages">{pageIndex > 0 ? <Link className="text-link" href={`/history/created?page=${pageIndex - 1}`}>Newer captions</Link> : null}{hasMore ? <Link className="text-link" href={`/history/created?page=${pageIndex + 1}`}>Older captions</Link> : null}</nav>
  </section></main></div>;
}
