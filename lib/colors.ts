// Shared by server and client components — must not live in a "use client" file.
export const DOMAIN_COLORS: Record<string, string> = {
  health: "var(--c-health)",
  "soft-skill": "var(--c-soft)",
  education: "var(--c-edu)",
  other: "var(--c-other)",
};

export function domainColor(slug: string | undefined): string {
  return DOMAIN_COLORS[slug ?? "other"] ?? "var(--c-other)";
}
