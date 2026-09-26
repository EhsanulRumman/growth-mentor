"use client";

import { useTransition } from "react";
import { deleteActivity } from "@/app/actions";
import type { Activity, Domain, Goal } from "@/lib/scoring";
import { activityPoints } from "@/lib/scoring";
import { domainColor } from "./ui";

export function ActivityFeed({
  activities,
  goals,
  domains,
}: {
  activities: Activity[];
  goals: Goal[];
  domains: Domain[];
}) {
  const [pending, start] = useTransition();
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const slugOf = (goalId: string | null) =>
    domains.find((d) => d.id === goalById.get(goalId ?? "")?.domain_id)?.slug;

  const recent = activities.slice(0, 15);

  return (
    <section className="card" aria-labelledby="feed-h">
      <h2 id="feed-h" className="eyebrow">Recent activity</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm muted">Nothing logged yet.</p>
      ) : (
        <ul className={`mt-3 divide-y divide-[var(--line)] ${pending ? "opacity-60" : ""}`} data-testid="activity-feed">
          {recent.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2.5">
              <span className="dot mt-1.5" style={{ background: domainColor(slugOf(a.goal_id)) }} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-sm">
                  <b className="capitalize">{a.activity_type}</b>
                  <span className="muted"> · {goalById.get(a.goal_id ?? "")?.title ?? "Deleted goal"}</span>
                </div>
                {a.notes && <div className="truncate text-sm muted">{a.notes}</div>}
                <div className="text-xs muted tabular-nums">
                  {a.activity_date} · {a.duration_minutes ?? 0} min · effort {Number(a.value) || 0}/5 · +
                  {Math.round(activityPoints(a) * 10) / 10} pts
                </div>
              </div>
              <button
                className="btn-ghost text-xs"
                aria-label={`Delete ${a.activity_type} on ${a.activity_date}`}
                onClick={() => {
                  if (confirm("Delete this activity?")) start(() => void deleteActivity(a.id, a.activity_date));
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
