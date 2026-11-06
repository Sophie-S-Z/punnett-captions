"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="app-shell page-body" id="main"><h1>This page did not load</h1><p className="intro">Check your connection, then try again.</p><button className="app-button" onClick={reset}>Try again</button></main>;
}
