"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { deleteGoal, saveGoal, setGoalStatus, type ActionResult } from "@/app/actions";
import type { Domain, Goal } from "@/lib/scoring";
import { GOAL_WEEKLY_TARGET } from "@/lib/scoring";
import { FormError, SubmitButton } from "./ui";
import { domainColor } from "@/lib/colors";

type Filter = "active" | "completed" | "all";

export function GoalsPanel({
  goals,
  domains,
  weekPoints,
}: {
  goals: Goal[];
  domains: Domain[];
  weekPoints: Record<string, number>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("active");

  const shown = goals.filter((g) => filter === "all" || g.status === filter);
  const counts = {
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    all: goals.length,
  };

  return (
    <section className="card" aria-labelledby="goals-h">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="goals-h" className="eyebrow">Goals</h2>
        <div className="flex items-center gap-1" role="tablist" aria-label="Filter goals">
          {(["active", "completed", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`chip ${filter === f ? "chip-on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f} {counts[f]}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-3" data-testid="goal-list">
        {shown.length === 0 && <li className="text-sm muted">No {filter === "all" ? "" : filter} goals.</li>}
        {shown.map((g) =>
          editingId === g.id ? (
            <li key={g.id}>
              <GoalForm goal={g} domains={domains} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <GoalRow key={g.id} goal={g} domains={domains} points={weekPoints[g.id] ?? 0} onEdit={() => setEditingId(g.id)} />
          ),
        )}
      </ul>

      <div className="mt-4">
        {adding ? (
          <GoalForm domains={domains} onDone={() => setAdding(false)} />
        ) : (
          <button className="btn-secondary" onClick={() => setAdding(true)}>+ New goal</button>
        )}
      </div>
    </section>
  );
}

function GoalRow({ goal, domains, points, onEdit }: { goal: Goal; domains: Domain[]; points: number; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const domain = domains.find((d) => d.id === goal.domain_id);
  const pct = Math.min(100, Math.round((points / GOAL_WEEKLY_TARGET) * 100));
  const done = goal.status === "completed";

  return (
    <li className={`goal ${done ? "goal-done" : ""} ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          aria-label={done ? `Reopen ${goal.title}` : `Mark ${goal.title} complete`}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
          onChange={() => start(() => void setGoalStatus(goal.id, done ? "active" : "completed"))}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium goal-title">{goal.title}</span>
            <span className="tag" style={{ color: domainColor(domain?.slug), borderColor: domainColor(domain?.slug) }}>
              {domain?.name ?? "No domain"}
            </span>
            <span className="tag">{goal.term === "long" ? "Long-term" : "Short-term"}</span>
          </div>
          {goal.description && <p className="mt-0.5 text-sm muted">{goal.description}</p>}
          {!done && (
            <div className="mt-2">
              <div className="flex justify-between text-xs muted">
                <span>This week</span>
                <span className="tabular-nums">{Math.round(points)} / {GOAL_WEEKLY_TARGET} pts</span>
              </div>
              <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${goal.title} weekly progress`}>
                <div style={{ width: `${pct}%`, background: domainColor(domain?.slug) }} />
              </div>
            </div>
          )}
          {goal.target_date && <div className="mt-1 text-xs muted">Target: {goal.target_date}</div>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button className="btn-ghost text-xs" onClick={onEdit}>Edit</button>
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              if (confirm(`Delete "${goal.title}" and its logged activities?`)) start(() => void deleteGoal(goal.id));
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

function GoalForm({ goal, domains, onDone }: { goal?: Goal; domains: Domain[]; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(saveGoal, { ok: false });
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="goal-form grid gap-3 sm:grid-cols-2">
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <label className="sm:col-span-2">
        <span className="label">Goal</span>
        <input name="title" required defaultValue={goal?.title} placeholder="e.g. Read 24 books this year" className="field w-full" />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Why / what does done look like?</span>
        <input name="description" defaultValue={goal?.description ?? ""} className="field w-full" />
      </label>
      <label>
        <span className="label">Domain</span>
        <select name="domain_id" defaultValue={goal?.domain_id ?? domains[0]?.id} className="field w-full">
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Horizon</span>
        <select name="term" defaultValue={goal?.term ?? "short"} className="field w-full">
          <option value="short">Short-term</option>
          <option value="long">Long-term</option>
        </select>
      </label>
      <label>
        <span className="label">Target date</span>
        <input name="target_date" type="date" defaultValue={goal?.target_date ?? ""} className="field w-full" />
      </label>
      <div className="flex items-end gap-2">
        <SubmitButton>{goal ? "Save" : "Add goal"}</SubmitButton>
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
      </div>
      <FormError error={state.error} />
    </form>
  );
}
