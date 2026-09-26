import { NextResponse } from "next/server";
import { loadAppData } from "@/lib/data";
import { scorecardHistory } from "@/lib/scoring";

export const dynamic = "force-dynamic";

/** Reports app + database reachability. Exposes the Supabase host only (it's public), never keys. */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("dump") === "1") {
    // Demo data is already public on the homepage; exposed here to debug rendering.
    return NextResponse.json(await loadAppData());
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let host: string | null = null;
  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = "invalid URL";
  }

  let database: Record<string, unknown> = { configured: Boolean(url && key), host };
  if (url && key) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/domains?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      database = { ...database, reachable: true, httpStatus: res.status, body: (await res.text()).slice(0, 300) };
    } catch (e) {
      const err = e as Error & { cause?: { code?: string; message?: string } };
      database = { ...database, reachable: false, error: err.message, cause: err.cause?.code ?? err.cause?.message };
    }
  }

  // Exercise the same load + scoring path as the homepage and report where it fails.
  let app: Record<string, unknown> = {};
  try {
    const data = await loadAppData();
    const history = scorecardHistory(data.today, 8, data.activities, data.goals, data.domains);
    app = {
      ok: true,
      today: data.today,
      vision: Boolean(data.vision),
      domains: data.domains.length,
      goals: data.goals.length,
      activities: data.activities.length,
      composite: history.at(-1)?.composite,
    };
  } catch (e) {
    const err = e as Error;
    app = { ok: false, error: err.message, stack: err.stack?.split("\n").slice(0, 6) };
  }

  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString(), database, app });
}
