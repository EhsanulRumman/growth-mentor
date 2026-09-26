import { loadAppData, SetupError } from "@/lib/data";
import { goalWeekPoints, scorecardHistory, weekStartOf } from "@/lib/scoring";
import { VisionCard } from "./components/VisionCard";
import { ScorecardPanel } from "./components/ScorecardPanel";
import { GoalsPanel } from "./components/GoalsPanel";
import { ActivityForm } from "./components/ActivityForm";
import { ActivityFeed } from "./components/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function Home() {
  let data;
  try {
    data = await loadAppData();
  } catch (e) {
    return <SetupNeeded message={e instanceof SetupError ? e.message : String(e)} />;
  }

  const { vision, domains, goals, activities, today } = data;
  const history = scorecardHistory(today, 8, activities, goals, domains);
  const current = history[history.length - 1];
  const ws = weekStartOf(today);
  const weekPoints = Object.fromEntries(goals.map((g) => [g.id, goalWeekPoints(g.id, ws, activities)]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="logo" aria-hidden>↗</span>
          <h1 className="text-lg font-semibold tracking-tight">Growth Mentor</h1>
        </div>
        <span className="text-sm muted">Think 10x. Act weekly.</span>
      </header>

      <VisionCard vision={vision} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-5">
          <ScorecardPanel card={current} history={history} domains={domains} />
        </div>
        <div className="space-y-5">
          <ActivityForm goals={goals} />
          <GoalsPanel goals={goals} domains={domains} weekPoints={weekPoints} />
          <ActivityFeed activities={activities} goals={goals} domains={domains} />
        </div>
      </div>
    </main>
  );
}

function SetupNeeded({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="card">
        <h1 className="text-xl font-semibold">Database not ready</h1>
        <p className="mt-2 muted">Growth Mentor couldn&apos;t load its data:</p>
        <pre className="mt-3 whitespace-pre-wrap rounded bg-[var(--bg)] p-3 text-sm">{message}</pre>
        <p className="mt-3 text-sm muted">
          Check that <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set,
          and that <code>supabase/migrations/0001_init.sql</code> has been run in the Supabase SQL editor.
        </p>
      </div>
    </main>
  );
}
