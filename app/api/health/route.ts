import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Reports app + database reachability. Exposes the Supabase host only (it's public), never keys. */
export async function GET() {
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

  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString(), database });
}
