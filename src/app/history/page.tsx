import Link from "next/link";
import { CaptionGallery } from "@/components/product/CaptionGallery";
import { AppHeader } from "@/components/product/AppHeader";
import { requireUser } from "@/lib/supabase/user";
import { requireCompleteProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { parseVotePage, PAGE_SIZE, type VoteRecord } from "@/lib/punnett/rating";
export const dynamic = "force-dynamic";
export default async function NotebookPage({ searchParams }: { searchParams: Promise<{ votesPage?: string }> }) {
  await requireUser();
  await requireCompleteProfile();
  const supabase = await createClient();
  const params = await searchParams;
  const rawPage = Number(params.votesPage ?? 0);
  const pageIndex = Number.isSafeInteger(rawPage) && rawPage >= 0 && rawPage <= 2000 ? rawPage : 0;
  const history = await supabase.rpc("punnett_vote_history", { offset_input: pageIndex * PAGE_SIZE });
  let votes: VoteRecord[] = [];
  let hasMore = false;
  let error = Boolean(history.error);
  if (!error) { try { const page = parseVotePage(history.data); votes = page.rows; hasMore = page.hasMore; } catch { error = true; } }
  return <div className="app-shell"><AppHeader /><main id="main" className="page-body"><section className="selection-history" aria-labelledby="history-title">
    <nav className="duel-controls" aria-label="History views"><Link className="text-link" href="/history/created">Your creations</Link><Link className="text-link" href="/history" aria-current="page">Your votes</Link></nav><div className="page-heading"><div><h1 id="history-title">Caption history</h1><p className="intro">Each image with the two captions you compared, newest first.</p></div><Link className="app-button button-primary" href="/">Create captions</Link></div>
    {error ? <p className="form-error" role="alert">Your caption history could not be loaded. Reload to try again.</p> : votes.length ? <CaptionGallery voting captions={votes.map(vote => ({ ...vote, id: vote.captionId }))} /> : <div className="chamber-empty"><h2>Your first laugh goes here.</h2><p>Vote on a caption pair to save the image and both captions to your history.</p><Link className="app-button" href="/?mode=duel">Vote on captions</Link></div>}
    <nav className="duel-controls" aria-label="Caption history pages">{pageIndex > 0 ? <Link className="text-link" href={`/history?votesPage=${pageIndex - 1}`}>Newer votes</Link> : null}{hasMore ? <Link className="text-link" href={`/history?votesPage=${pageIndex + 1}`}>Older votes</Link> : null}</nav>
  </section></main></div>;
}
