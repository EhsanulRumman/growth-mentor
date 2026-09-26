import { createClient } from "@/lib/supabase/server";
import { addDays, todayISO, type Activity, type Domain, type Goal } from "@/lib/scoring";

export type Vision = {
  id: string;
  statement: string;
  target_year: number | null;
  created_at: string;
};

export type AppData = {
  vision: Vision | null;
  domains: Domain[];
  goals: Goal[];
  activities: Activity[];
  today: string;
};

export class SetupError extends Error {}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const DEFAULT_DOMAINS = [
  { name: "Health", slug: "health" },
  { name: "Soft Skill", slug: "soft-skill" },
  { name: "Education", slug: "education" },
  { name: "Other", slug: "other" },
];

/**
 * Demo seed so anonymous visitors see a working app instantly. Only runs when
 * the relevant tables are empty, so it never overwrites real data.
 */
async function ensureSeed(supabase: Awaited<ReturnType<typeof createClient>>, today: string) {
  const { data: domains, error: dErr } = await supabase.from("domains").select("id,slug");
  if (dErr) throw new SetupError(dErr.message);
  if (!domains || domains.length === 0) {
    const { error } = await supabase.from("domains").insert(DEFAULT_DOMAINS);
    if (error) throw new SetupError(error.message);
  }

  const [{ count: visionCount }, { count: goalCount }] = await Promise.all([
    supabase.from("visions").select("id", { count: "exact", head: true }),
    supabase.from("goals").select("id", { count: "exact", head: true }),
  ]);
  if ((visionCount ?? 0) > 0 || (goalCount ?? 0) > 0) return;

  const { data: vision, error: vErr } = await supabase
    .from("visions")
    .insert({
      statement:
        "Become a world-class educator and build a platform that teaches 100,000 students exponential growth principles by 2035.",
      target_year: 2035,
    })
    .select("id")
    .single();
  if (vErr) throw new SetupError(vErr.message);

  const { data: ds } = await supabase.from("domains").select("id,slug");
  const dom = (slug: string) => ds?.find((d) => d.slug === slug)?.id ?? null;

  const { data: goals, error: gErr } = await supabase
    .from("goals")
    .insert([
      {
        vision_id: vision.id,
        domain_id: dom("health"),
        title: "Run a half marathon",
        description: "Train consistently and complete a half marathon within 6 months.",
        term: "short",
        target_date: addDays(today, 180),
      },
      {
        vision_id: vision.id,
        domain_id: dom("soft-skill"),
        title: "Master public speaking",
        description: "Deliver 10 talks to audiences of 50+ people this year.",
        term: "long",
        target_date: addDays(today, 365),
      },
      {
        vision_id: vision.id,
        domain_id: dom("education"),
        title: "Complete ML certification",
        description: "Earn a machine learning certification to strengthen teaching credentials.",
        term: "short",
        target_date: addDays(today, 90),
      },
    ])
    .select("id,title");
  if (gErr) throw new SetupError(gErr.message);
  const gid = (title: string) => goals?.find((g) => g.title.startsWith(title))?.id;

  await supabase.from("activities").insert([
    // last week, so there's a trend to compare against
    { goal_id: gid("Run"), activity_type: "run", duration_minutes: 40, value: 3, notes: "Easy 4km", activity_date: addDays(today, -8) },
    { goal_id: gid("Complete ML"), activity_type: "study", duration_minutes: 60, value: 4, notes: "ML module 2", activity_date: addDays(today, -9) },
    { goal_id: gid("Master"), activity_type: "practice", duration_minutes: 20, value: 3, notes: "Rehearsed talk outline", activity_date: addDays(today, -10) },
    // this week
    { goal_id: gid("Run"), activity_type: "run", duration_minutes: 45, value: 5, notes: "5km morning run", activity_date: addDays(today, -1) },
    { goal_id: gid("Run"), activity_type: "gym", duration_minutes: 60, value: 4, notes: "Strength training session", activity_date: addDays(today, -2) },
    { goal_id: gid("Master"), activity_type: "talk", duration_minutes: 30, value: 5, notes: "Delivered talk to 60 students", activity_date: addDays(today, -1) },
    { goal_id: gid("Complete ML"), activity_type: "study", duration_minutes: 90, value: 5, notes: "Completed ML course module 3", activity_date: addDays(today, -3) },
  ]);
}

export async function loadAppData(): Promise<AppData> {
  if (!supabaseConfigured()) {
    throw new SetupError("Supabase environment variables are missing.");
  }
  const supabase = await createClient();
  const today = todayISO();
  await ensureSeed(supabase, today);

  // Enough history for the trend chart (8 weeks + 1 for the first "previous").
  const since = addDays(today, -7 * 10);

  const [visions, domains, goals, activities] = await Promise.all([
    supabase.from("visions").select("id,statement,target_year,created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("domains").select("id,name,slug").order("created_at"),
    supabase.from("goals").select("*").order("created_at"),
    supabase
      .from("activities")
      .select("*")
      .gte("activity_date", since)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  for (const r of [visions, domains, goals, activities]) {
    if (r.error) throw new SetupError(r.error.message);
  }

  return {
    vision: (visions.data?.[0] as Vision) ?? null,
    domains: (domains.data as Domain[]) ?? [],
    goals: (goals.data as Goal[]) ?? [],
    activities: (activities.data as Activity[]) ?? [],
    today,
  };
}
