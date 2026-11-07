"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaptionActions } from "./CaptionActions";

type Caption = {
  id: string;
  imageId: string;
  text: string;
  createdAt: string;
  vote?: 1 | -1;
};
export function CaptionGallery({
  captions,
  voting = false,
}: {
  captions: Caption[];
  voting?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "chosen" | "passed">("all");
  const reduce = useReducedMotion();
  const visible = captions.filter(
    (caption) =>
      caption.text
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (filter === "all" || caption.vote === (filter === "chosen" ? 1 : -1)),
  );
  return (
    <>
      <div className="gallery-toolbar">
        <div className="gallery-search">
          <label htmlFor="caption-search">Find a caption</label>
          <input
            id="caption-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the captions on this page…"
          />
        </div>
        {voting ? (
          <fieldset className="caption-filters">
            <legend className="sr-only">Filter your votes</legend>
            {(["all", "chosen", "passed"] as const).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="verdict"
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                />
                <span>
                  {value === "all"
                    ? "All votes"
                    : value === "chosen"
                      ? "Chosen"
                      : "Passed"}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}
        <p className="gallery-count" role="status">
          {visible.length} of {captions.length} on this page
        </p>
      </div>
      <ol className="caption-history-grid">
        <AnimatePresence initial={false}>
          {visible.map((caption) => (
            <motion.li
              key={caption.id}
              layout={reduce ? false : "position"}
              initial={false}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
            >
              <article className="history-caption">
                <Image
                  className="caption-card-image"
                  src={`/media/${caption.imageId}`}
                  alt="The original image for this caption"
                  width={800}
                  height={600}
                  unoptimized
                />
                <div className="history-caption-copy">
                  {caption.vote ? (
                    <p className="vote-result">
                      <span
                        className={
                          caption.vote === 1
                            ? "verdict-chosen"
                            : "verdict-passed"
                        }
                      >
                        {caption.vote === 1 ? "Chosen" : "Passed"}
                      </span>
                    </p>
                  ) : null}
                  <h2>{caption.text}</h2>
                  <CaptionActions
                    text={caption.text}
                    imageId={caption.imageId}
                  />
                  <div className="history-card-footer">
                    <time className="field-help" dateTime={caption.createdAt}>
                      {new Date(caption.createdAt).toLocaleDateString("en-US", {
                        timeZone: "America/New_York",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <Link
                      className="text-link"
                      href={`/?mode=duel&image=${encodeURIComponent(caption.imageId)}`}
                    >
                      Compare captions ↗
                    </Link>
                  </div>
                </div>
              </article>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {!visible.length ? (
        <div className="gallery-no-results">
          <h2>No matching captions.</h2>
          <p>Try a different phrase or clear your filters.</p>
          <button
            type="button"
            className="app-button button-quiet"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </>
  );
}
