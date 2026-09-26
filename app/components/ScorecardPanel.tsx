import type { Domain, Scorecard } from "@/lib/scoring";
import { DOMAIN_WEEKLY_TARGET } from "@/lib/scoring";
import { domainColor } from "./ui";

function fmtRange(start: string, end: string) {
  const f = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(start)} – ${f(end)}`;
}

const TREND_LABEL = { up: "▲", down: "▼", flat: "▬", new: "•" } as const;

export function ScorecardPanel({
  card,
  history,
  domains,
}: {
  card: Scorecard;
  history: Scorecard[];
  domains: Domain[];
}) {
  const nameOf = (slug: string) => domains.find((d) => d.slug === slug)?.name ?? slug;
  const delta = card.previous === null ? null : card.composite - card.previous;
  const domainEntries = Object.entries(card.domainScores).sort((a, b) => b[1] - a[1]);

  return (
    <section className="card" aria-labelledby="score-h" data-testid="scorecard">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="score-h" className="eyebrow">Weekly scorecard</h2>
        <span className="text-sm muted">{fmtRange(card.weekStart, card.weekEnd)}</span>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="score-big" data-testid="composite-score">{card.composite}</div>
        <div className="pb-2">
          <div className={`trend trend-${card.trend}`} data-testid="trend">
            {TREND_LABEL[card.trend]}{" "}
            {delta === null ? "First week" : `${delta > 0 ? "+" : ""}${delta} vs last week`}
          </div>
          <div className="text-sm muted">
            {card.activityCount} {card.activityCount === 1 ? "activity" : "activities"} · {Math.round(card.minutes / 6) / 10} h
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-3" aria-label="Per-domain scores">
        {domainEntries.length === 0 && (
          <li className="text-sm muted">Add a goal to start scoring a domain.</li>
        )}
        {domainEntries.map(([slug, score]) => (
          <li key={slug}>
            <div className="flex justify-between text-sm">
              <span>{nameOf(slug)}</span>
              <span className="tabular-nums" data-testid={`domain-${slug}`}>{score}</span>
            </div>
            <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={nameOf(slug)}>
              <div style={{ width: `${score}%`, background: domainColor(slug) }} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mentor mt-5">
        <div className="eyebrow">Mentor</div>
        <p className="mt-1">{card.summary}</p>
      </div>

      <TrendChart history={history} />

      <details className="mt-4 text-sm muted">
        <summary className="cursor-pointer">How scoring works</summary>
        <p className="mt-2">
          Each activity earns <b>1 pt per 10 minutes</b> + <b>2 pts per effort point</b> (0–5). A domain
          scores 100 at {DOMAIN_WEEKLY_TARGET} pts in a week. Your weekly score is the average across the
          domains you have active goals in. Weeks run Monday to Sunday.
        </p>
      </details>
    </section>
  );
}

function TrendChart({ history }: { history: Scorecard[] }) {
  const w = 320;
  const h = 90;
  const pad = 6;
  const n = history.length;
  if (n < 2) return null;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (n - 1);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const pts = history.map((c, i) => `${x(i)},${y(c.composite)}`).join(" ");

  return (
    <figure className="mt-5">
      <figcaption className="eyebrow">Last {n} weeks</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" role="img" aria-label={`Weekly scores: ${history.map((c) => c.composite).join(", ")}`}>
        <line x1={pad} x2={w - pad} y1={y(50)} y2={y(50)} className="grid-line" />
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {history.map((c, i) => (
          <circle key={c.weekStart} cx={x(i)} cy={y(c.composite)} r={i === n - 1 ? 4.5 : 3} fill={i === n - 1 ? "var(--accent)" : "var(--card)"} stroke="var(--accent)" strokeWidth={2}>
            <title>{`Week of ${c.weekStart}: ${c.composite}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
