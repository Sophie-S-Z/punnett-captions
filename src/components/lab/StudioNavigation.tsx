"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
export function StudioNavigation({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const query = useSearchParams();
  const voting = path === "/" && (query.get("mode") === "duel" || Boolean(query.get("image")));
  return <nav className="lab-nav" aria-label="Main"><Link href="/" aria-current={(path === "/" && !voting) ? "page" : undefined}>Create</Link><Link href="/?mode=duel" aria-current={voting ? "page" : undefined}>Vote</Link>{signedIn ? <Link href="/lab/notebook/created" aria-current={path.startsWith("/lab/notebook") ? "page" : undefined}>History</Link> : null}</nav>;
}
