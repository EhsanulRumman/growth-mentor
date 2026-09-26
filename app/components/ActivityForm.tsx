"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { logActivity, type ActionResult } from "@/app/actions";
import type { Goal } from "@/lib/scoring";
import { activityPoints } from "@/lib/scoring";
import { FormError, SubmitButton } from "./ui";

function localToday() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function ActivityForm({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === "active");
  const [state, action] = useActionState<ActionResult, FormData>(logActivity, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  const [minutes, setMinutes] = useState(30);
  const [value, setValue] = useState(3);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setMinutes(30);
      setValue(3);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <section className="card" aria-labelledby="log-h">
      <h2 id="log-h" className="eyebrow">Log activity</h2>
      {active.length === 0 ? (
        <p className="mt-3 text-sm muted">Create an active goal first, then log work against it.</p>
      ) : (
        <form ref={formRef} action={action} className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="activity-form">
          <label className="sm:col-span-2">
            <span className="label">Goal</span>
            <select name="goal_id" required className="field w-full" defaultValue={active[0]?.id}>
              {active.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">What did you do?</span>
            <input name="activity_type" required placeholder="run, study, talk…" className="field w-full" />
          </label>
          <label>
            <span className="label">Date</span>
            <input name="activity_date" type="date" required defaultValue={localToday()} className="field w-full" />
          </label>
          <label>
            <span className="label">Minutes</span>
            <input
              name="duration_minutes"
              type="number"
              min={0}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="field w-full"
            />
          </label>
          <label>
            <span className="label">Effort / quality: {value}/5</span>
            <input
              name="value"
              type="range"
              min={0}
              max={5}
              step={1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="label">Notes (optional)</span>
            <input name="notes" placeholder="What went well? What did you learn?" className="field w-full" />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <SubmitButton>Log it</SubmitButton>
            <span className="text-sm muted">
              +{Math.round(activityPoints({ duration_minutes: minutes, value }) * 10) / 10} pts
            </span>
            {flash && <span className="text-sm text-[var(--good)]" role="status">Logged. Scorecard updated.</span>}
          </div>
          <FormError error={state.error} />
        </form>
      )}
    </section>
  );
}
