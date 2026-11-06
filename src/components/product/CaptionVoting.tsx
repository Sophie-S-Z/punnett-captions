"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { nextPair, submitVote } from "@/app/selection/actions";
import type { CaptionPair } from "@/lib/punnett/pairing";
import { AuthControls } from "./AuthControls";
import { ProgressFeedback } from "./ProgressFeedback";

type CaptionVotingProps = {
  signedIn: boolean;
  initialPair: CaptionPair | null;
  initialError?: string;
};

export function CaptionVoting({ signedIn, initialPair, initialError }: CaptionVotingProps) {
  const [pair, setPair] = useState(initialPair);
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const busy = useRef(false);
  const reduceMotion = useReducedMotion();

  const loadNext = useCallback(async (previousImageId?: string) => {
    const result = await nextPair(previousImageId);
    if (result.error) throw new Error(result.error);
    setPair(result.pair);
    setWinner(null);
  }, []);

  const skip = useCallback(async () => {
    if (!signedIn || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try { await loadNext(pair?.imageId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The next pair could not be loaded. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }, [signedIn, pair, loadNext]);

  const choose = useCallback(async (side: "left" | "right") => {
    if (!signedIn || !pair || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const chosen = pair[side];
    const other = pair[side === "left" ? "right" : "left"];
    let voteRecorded = false;
    try {
      const result = await submitVote(chosen.id, other.id);
      if (!result.ok && !result.duplicate) throw new Error(result.error || "Your selection could not be saved. Choose a caption to try again.");
      voteRecorded = true;
      if (result.duplicate) {
        toast("This pair was already judged. Loading the next pair.");
      } else {
        setWinner(chosen.id);
        toast.success("Selection saved.");
        // This brief pause displays the persisted result, rather than predicting a vote.
        if (!reduceMotion) await new Promise(resolve => setTimeout(resolve, 350));
      }
      setPair(null);
      await loadNext();
    } catch (cause) {
      setError(voteRecorded
        ? "Your vote is recorded. The next pair could not be loaded. Try loading again or check your vote history."
        : cause instanceof Error ? cause.message : "Your selection could not be saved. Please try again.");
    } finally { busy.current = false; setPending(false); }
  }, [signedIn, pair, reduceMotion, loadNext]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable]")))) return;
      const key = event.key.toLowerCase();
      if (!signedIn || busy.current || !pair || !["a", "b", "s"].includes(key)) return;
      event.preventDefault();
      if (key === "s") void skip();
      else void choose(key === "a" ? "left" : "right");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signedIn, pair, choose, skip]);

  return <section className="selection-chamber" aria-label="Vote on captions" aria-busy={pending}>
    <div className="chamber-heading"><h1>Which caption is funnier?</h1>{signedIn ? <Link className="text-link" href="/">Create captions</Link> : null}</div>
    {error ? <div className="chamber-error" role="alert"><p>{error}</p><button type="button" className="app-button button-quiet" onClick={() => signedIn ? void skip() : window.location.reload()} disabled={pending}>Try loading again</button>{signedIn ? <Link className="text-link" href="/history">See your vote history</Link> : null}</div> : null}
    {pair ? <div className="duel-stage">
      <div className={`duel-layout ${!signedIn ? "duel-locked" : ""}`}>
        <figure className="duel-image"><Image src={`/media/${pair.imageId}`} alt="The image used to generate both captions" width={1200} height={900} unoptimized /></figure>
        <div className="duel-cards"><AnimatePresence mode="wait" initial={false}><motion.div className="duel-pair" key={`${pair.left.id}:${pair.right.id}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
          {(["left", "right"] as const).map((side, index) => {
            const caption = pair[side];
            return <motion.button type="button" key={caption.id} className="duel-card" disabled={!signedIn || pending} aria-pressed={winner === caption.id} aria-label={`Choose caption ${index === 0 ? "A" : "B"}: ${caption.text}`} onClick={() => void choose(side)} data-state={winner ? winner === caption.id ? "winner" : "loser" : "idle"}>
              <span className="duel-card-meta"><span className="duel-key" aria-hidden="true">{index === 0 ? "A" : "B"}</span></span>
              <span className="duel-caption">{caption.text}</span><span className="duel-select-label">{winner === caption.id ? "Chosen" : "Choose this one"}</span>
            </motion.button>;
          })}
        </motion.div></AnimatePresence>
          <div className="duel-controls"><p className="field-help">{signedIn ? <><kbd>A</kbd> left · <kbd>B</kbd> right · <kbd>S</kbd> skip</> : "Sign in to vote for a caption."}</p><button type="button" className="app-button button-quiet" disabled={!signedIn || pending} onClick={() => void skip()}>Skip pair</button></div>
        </div>
      </div>
      {!signedIn ? <div className="chamber-glass"><div><h2>Found your favorite?</h2><p>Sign in with Google to vote, or to make captions for your own image.</p><AuthControls /></div></div> : null}
    </div> : pending ? <ProgressFeedback label="Loading captions…" description="Finding your next pair of captions." /> : !error ? <div className="chamber-empty"><h3>{signedIn ? "No unrated caption pairs right now." : "No caption pairs yet."}</h3>{signedIn ? <><p>Upload an image to create more captions.</p><Link className="app-button button-primary" href="/">Create captions</Link></> : <><p>Sign in to create captions from your own images.</p><AuthControls /></>}</div> : null}
    {pending && pair ? <p className="chamber-pending" role="status">{winner ? "Vote saved. Loading the next pair…" : "Saving or loading captions…"}</p> : null}
  </section>;
}
