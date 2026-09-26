"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn-primary ${className}`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>;
}

export const DOMAIN_COLORS: Record<string, string> = {
  health: "var(--c-health)",
  "soft-skill": "var(--c-soft)",
  education: "var(--c-edu)",
  other: "var(--c-other)",
};

export function domainColor(slug: string | undefined): string {
  return DOMAIN_COLORS[slug ?? "other"] ?? "var(--c-other)";
}
