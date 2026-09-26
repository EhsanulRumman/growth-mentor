"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  computeScorecard,
  mentorSummary,
  todayISO,
  trendOf,
  weekStartOf,
  type Activity,
  type Domain,
  type Goal,
} from "@/lib/scoring";

export type ActionResult = { ok: boolean; error?: string };

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}
function num(fd: FormData, key: string, fallback = 0): number {
  const n = Number(fd.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Persist a snapshot of a week's scorecard to weekly_scorecards. */
async function snapshotWeek(weekStart: string) {
  const supabase = await createClient();
  const prevStart = addDays(weekStart, -7);
  const [{ data: goals }, { data: domains }, { data: acts }] = await Promise.all([
    supabase.from("goals").select("*"),
    supabase.from("domains").select("id,name,slug"),
    supabase
      .from("activities")
      .select("*")
      .gte("activity_date", prevStart)
      .lte("activity_date", addDays(weekStart, 6)),
  ]);
  const g = (goals as Goal[]) ?? [];
  const d = (domains as Domain[]) ?? [];
  const a = (acts as Activity[]) ?? [];

  const prev = computeScorecard(prevStart, a, g, d);
  // Same rule as scorecardHistory: a week counts as 0 once any history exists.
  const { count: priorCount } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .lte("activity_date", prev.weekEnd);
  const previous = (priorCount ?? 0) > 0 ? prev.composite : null;
  const base = computeScorecard(weekStart, a, g, d);
  const withTrend = { ...base, previous, trend: trendOf(base.composite, previous) };
  const summary = mentorSummary(withTrend, d);

  const row = {
    week_start: weekStart,
    week_end: base.weekEnd,
    composite_score: base.composite,
    domain_scores: base.domainScores,
    activity_count: base.activityCount,
    previous_score: previous,
    trend: withTrend.trend,
    ai_summary: summary,
    ai_source: "rule-based",
    ai_confidence: 1,
  };

  const { data: existing } = await supabase
    .from("weekly_scorecards")
    .select("id")
    .eq("week_start", weekStart)
    .is("user_id", null)
    .limit(1);
  if (existing && existing.length > 0) {
    await supabase.from("weekly_scorecards").update(row).eq("id", existing[0].id);
  } else {
    await supabase.from("weekly_scorecards").insert(row);
  }
}

async function afterActivityChange(date: string) {
  const ws = weekStartOf(date);
  // The following week's trend depends on this week, so refresh it too
  // (only if it isn't in the future).
  await snapshotWeek(ws);
  const next = addDays(ws, 7);
  if (next <= todayISO()) await snapshotWeek(next);
  revalidatePath("/");
}

// ---------------- Vision ----------------

export async function saveVision(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const statement = str(fd, "statement");
  const targetYear = num(fd, "target_year", new Date().getFullYear() + 10);
  const id = str(fd, "id");
  if (statement.length < 5) return { ok: false, error: "Write your vision in at least a sentence." };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("visions").update({ statement, target_year: targetYear }).eq("id", id)
    : await supabase.from("visions").insert({ statement, target_year: targetYear });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

// ---------------- Goals ----------------

export async function saveGoal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (!title) return { ok: false, error: "Give the goal a title." };
  const targetDate = str(fd, "target_date");
  const term = str(fd, "term") === "long" ? "long" : "short";

  const fields = {
    title,
    description: str(fd, "description") || null,
    domain_id: str(fd, "domain_id") || null,
    term,
    target_date: isDate(targetDate) ? targetDate : null,
  };

  const supabase = await createClient();
  let error;
  if (id) {
    ({ error } = await supabase.from("goals").update(fields).eq("id", id));
  } else {
    const { data: v } = await supabase
      .from("visions")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1);
    ({ error } = await supabase
      .from("goals")
      .insert({ ...fields, vision_id: v?.[0]?.id ?? null, status: "active" }));
  }
  if (error) return { ok: false, error: error.message };
  // Domains scored this week depend on active goals.
  await snapshotWeek(weekStartOf(todayISO()));
  revalidatePath("/");
  return { ok: true };
}

export async function setGoalStatus(id: string, status: "active" | "completed"): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await snapshotWeek(weekStartOf(todayISO()));
  revalidatePath("/");
  return { ok: true };
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await snapshotWeek(weekStartOf(todayISO()));
  revalidatePath("/");
  return { ok: true };
}

// ---------------- Activities ----------------

export async function logActivity(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const goalId = str(fd, "goal_id");
  const type = str(fd, "activity_type");
  const date = str(fd, "activity_date");
  const minutes = Math.max(0, Math.round(num(fd, "duration_minutes")));
  const value = Math.min(5, Math.max(0, num(fd, "value", 3)));
  if (!goalId) return { ok: false, error: "Pick a goal." };
  if (!type) return { ok: false, error: "What did you do? (e.g. run, study, talk)" };
  if (!isDate(date)) return { ok: false, error: "Pick a valid date." };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    goal_id: goalId,
    activity_type: type,
    duration_minutes: minutes,
    value,
    notes: str(fd, "notes") || null,
    activity_date: date,
  });
  if (error) return { ok: false, error: error.message };
  await afterActivityChange(date);
  return { ok: true };
}

export async function deleteActivity(id: string, date: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await afterActivityChange(date);
  return { ok: true };
}
