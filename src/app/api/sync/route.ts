import { NextResponse } from "next/server";
import { runFullSync } from "@/lib/leaflink/sync";

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
