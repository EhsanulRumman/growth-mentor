"use client";

import { useActionState, useEffect, useState } from "react";
import { saveVision, type ActionResult } from "@/app/actions";
import type { Vision } from "@/lib/data";
import { FormError, SubmitButton } from "./ui";

export function VisionCard({ vision }: { vision: Vision | null }) {
  const [editing, setEditing] = useState(!vision);
  const [state, action] = useActionState<ActionResult, FormData>(saveVision, { ok: false });

  useEffect(() => {
    if (state.ok) setEditing(false);
  }, [state]);

  return (
    <section className="card vision" aria-labelledby="vision-h">
      <div className="flex items-start justify-between gap-3">
        <h2 id="vision-h" className="eyebrow">
          10-year vision{vision?.target_year ? ` · ${vision.target_year}` : ""}
        </h2>
        {vision && !editing && (
          <button className="btn-ghost" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>

      {editing ? (
        <form action={action} className="mt-3 space-y-3">
          {vision && <input type="hidden" name="id" value={vision.id} />}
          <textarea
            name="statement"
            required
            rows={3}
            defaultValue={vision?.statement}
            placeholder="Where will you be in 10 years if everything goes right? Think 10x, not 2x."
            className="field w-full text-lg"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm muted">
              Target year{" "}
              <input
                name="target_year"
                type="number"
                min={2000}
                max={2100}
                defaultValue={vision?.target_year ?? new Date().getFullYear() + 10}
                className="field w-24"
              />
            </label>
            <SubmitButton>Save vision</SubmitButton>
            {vision && (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            )}
          </div>
          <FormError error={state.error} />
        </form>
      ) : (
        <p className="vision-text">{vision?.statement}</p>
      )}
    </section>
  );
}
