// Pure scoring engine for the weekly scorecard. No I/O — safe to unit test.

export type Domain = { id: string; name: string; slug: string };

export type Goal = {
  id: string;
  vision_id: string | null;
  domain_id: string | null;
  title: string;
  description: string | null;
  term: "short" | "long" | string;
  status: "active" | "completed" | string;
  target_date: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  goal_id: string | null;
  activity_type: string;
  duration_minutes: number | null;
  value: number | string | null;
  notes: string | null;
  activity_date: string;
  created_at: string;
};

export type Trend = "up" | "down" | "flat" | "new";

export type Scorecard = {
  weekStart: string;
  weekEnd: string;
  composite: number;
  domainScores: Record<string, number>;
  domainPoints: Record<string, number>;
  activityCount: number;
  minutes: number;
  previous: number | null;
  trend: Trend;
  summary: string;
};

/** Points needed in one domain in one week to score 100. */
export const DOMAIN_WEEKLY_TARGET = 40;
/** Points needed on one goal in one week to fill its progress bar. */
export const GOAL_WEEKLY_TARGET = 20;

/** Every 10 minutes = 1 pt, plus 2 pts per quality/effort point (0–5). */
export function activityPoints(a: Pick<Activity, "duration_minutes" | "value">): number {
  const minutes = Math.max(0, Number(a.duration_minutes) || 0);
  const value = Math.min(5, Math.max(0, Number(a.value) || 0));
  return minutes / 10 + value * 2;
}

// ---- dates (all YYYY-MM-DD, computed in UTC so they're timezone-stable) ----

function parse(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: string, n: number): string {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
}
/** Monday of the week containing `d`. */
export function weekStartOf(d: string): string {
  const x = parse(d);
  const dow = (x.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(d, -dow);
}
export function todayISO(timeZone = process.env.APP_TIMEZONE || "UTC"): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// ---- scorecard ----

function round(n: number): number {
  return Math.round(n);
}

export function computeScorecard(
  weekStart: string,
  activities: Activity[],
  goals: Goal[],
  domains: Domain[],
): Omit<Scorecard, "previous" | "trend" | "summary"> {
  const weekEnd = addDays(weekStart, 6);
  const goalDomain = new Map(goals.map((g) => [g.id, g.domain_id]));
  const slugById = new Map(domains.map((d) => [d.id, d.slug]));

  const inWeek = activities.filter(
    (a) => a.activity_date >= weekStart && a.activity_date <= weekEnd,
  );

  const domainPoints: Record<string, number> = {};
  let minutes = 0;
  for (const a of inWeek) {
    const slug = slugById.get(goalDomain.get(a.goal_id ?? "") ?? "") ?? "other";
    domainPoints[slug] = (domainPoints[slug] ?? 0) + activityPoints(a);
    minutes += Number(a.duration_minutes) || 0;
  }

  // Score only the domains you're actually working on (have an active goal),
  // plus any domain you logged work in this week. An empty domain with no
  // goals shouldn't drag your score down.
  const scored = new Set<string>();
  for (const g of goals) {
    if (g.status === "active" && g.domain_id) {
      const slug = slugById.get(g.domain_id);
      if (slug) scored.add(slug);
    }
  }
  for (const slug of Object.keys(domainPoints)) scored.add(slug);

  const domainScores: Record<string, number> = {};
  for (const slug of scored) {
    domainScores[slug] = round(
      Math.min(100, ((domainPoints[slug] ?? 0) / DOMAIN_WEEKLY_TARGET) * 100),
    );
  }
  const values = Object.values(domainScores);
  const composite = values.length
    ? round(values.reduce((s, v) => s + v, 0) / values.length)
    : 0;

  return {
    weekStart,
    weekEnd,
    composite,
    domainScores,
    domainPoints,
    activityCount: inWeek.length,
    minutes,
  };
}

export function trendOf(current: number, previous: number | null): Trend {
  if (previous === null) return "new";
  if (current - previous > 2) return "up";
  if (previous - current > 2) return "down";
  return "flat";
}

/** Rule-based mentor summary — works with no AI key. */
export function mentorSummary(
  card: Omit<Scorecard, "summary">,
  domains: Domain[],
): string {
  const name = (slug: string) => domains.find((d) => d.slug === slug)?.name ?? slug;
  const entries = Object.entries(card.domainScores).sort((a, b) => b[1] - a[1]);

  if (card.activityCount === 0) {
    return "No activity logged yet this week. Pick the goal that matters most for your 10-year vision and log one focused session today.";
  }

  const parts: string[] = [];
  if (card.trend === "up" && card.previous !== null)
    parts.push(`Up ${card.composite - card.previous} points on last week, so keep this momentum.`);
  else if (card.trend === "down" && card.previous !== null)
    parts.push(`Down ${card.previous - card.composite} points on last week. Protect time for your key goals.`);
  else if (card.trend === "flat") parts.push("About level with last week.");

  const [best] = entries;
  const worst = entries[entries.length - 1];
  if (best) parts.push(`Strongest area: ${name(best[0])} (${best[1]}).`);
  if (worst && worst[0] !== best?.[0])
    parts.push(`${name(worst[0])} needs focus (${worst[1]}). Schedule one deep session there next.`);

  if (card.composite >= 85) parts.push("Elite week. Now raise the bar: what would 10x look like?");
  else if (card.composite < 40) parts.push("Small consistent reps compound. Aim for one session per goal before Sunday.");

  return parts.join(" ");
}

/** Build scorecards for the last `weeks` weeks ending with the week of `today`. Oldest first. */
export function scorecardHistory(
  today: string,
  weeks: number,
  activities: Activity[],
  goals: Goal[],
  domains: Domain[],
): Scorecard[] {
  const current = weekStartOf(today);
  const out: Scorecard[] = [];
  // one extra week at the start so the first shown week has a "previous"
  let previous: number | null = null;
  for (let i = weeks; i >= 0; i--) {
    const ws = addDays(current, -7 * i);
    const base = computeScorecard(ws, activities, goals, domains);
    const trend = trendOf(base.composite, previous);
    const withTrend = { ...base, previous, trend };
    const card: Scorecard = { ...withTrend, summary: mentorSummary(withTrend, domains) };
    if (i < weeks) out.push(card);
    // A week before any activity existed counts as "no data", not zero.
    const anyBefore = activities.some((a) => a.activity_date <= base.weekEnd);
    previous = anyBefore ? base.composite : null;
  }
  return out;
}

export function goalWeekPoints(goalId: string, weekStart: string, activities: Activity[]): number {
  const weekEnd = addDays(weekStart, 6);
  return activities
    .filter((a) => a.goal_id === goalId && a.activity_date >= weekStart && a.activity_date <= weekEnd)
    .reduce((s, a) => s + activityPoints(a), 0);
}
