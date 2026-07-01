import { NextResponse } from "next/server";
import { runFullSync } from "@/lib/leaflink/sync";

// Syncing many orders (each with several sequential DB writes) can run past
// the platform's default function timeout, which kills the request before it
// can record success/error and leaves the run stuck at "running". Raise the
// limit to the max Vercel allows (60s on Hobby, more on paid plans).
export const maxDuration = 60;

export async function POST() {
  try {
    const results = await runFullSync();
    const hasError = results.some((r) => r.status === "error");
    return NextResponse.json({ results }, { status: hasError ? 207 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
