import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitVote } from "@/app/selection/actions";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ ok: false, error: "Request origin was rejected." }, { status: 403 });
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (!data.user || error) return NextResponse.json({ ok: false, error: "Sign in to vote on captions." }, { status: 401 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("winnerId" in body) || !("loserId" in body) || typeof body.winnerId !== "string" || typeof body.loserId !== "string") return NextResponse.json({ ok: false, error: "Choose two distinct captions." }, { status: 400 });
    const result = await submitVote(body.winnerId, body.loserId);
    return NextResponse.json(result, { status: result.ok ? 200 : result.duplicate ? 409 : 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "The selection could not be processed. Please try again." }, { status: 400 });
  }
}
