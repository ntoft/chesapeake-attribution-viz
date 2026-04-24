import type { AttributionBelief } from '../types';
import { CAUSE_COLORS } from '../colors';

interface Props {
  beliefs: AttributionBelief[];
}

// Fuses per-cause shares across the three personas into a single stacked
// bar. For each cause we take the unweighted mean of persona shares so
// the strip answers "across the three viewpoints, how much weight lands
// on each cause" at a glance. A divergence pill flags when at least one
// persona disagrees by > 25 percentage points.
export function ConsensusStrip({ beliefs }: Props) {
  if (beliefs.length === 0) return null;

  const perCause = new Map<string, number[]>();
  for (const b of beliefs) {
    const list = perCause.get(b.data.cause) ?? [];
    list.push(b.data.share);
    perCause.set(b.data.cause, list);
  }

  const rows = [...perCause.entries()]
    .map(([cause, shares]) => {
      const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
      const spread = Math.max(...shares) - Math.min(...shares);
      return { cause, mean, spread, n: shares.length };
    })
    .sort((a, b) => b.mean - a.mean);

  const total = rows.reduce((a, r) => a + r.mean, 0) || 1;
  const hasDivergence = rows.some((r) => r.spread > 0.25);
  const top = rows[0];

  return (
    <section className="mx-4 mt-3 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
        <span>Consensus · mean across personas</span>
        {hasDivergence ? (
          <span className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 normal-case tracking-normal">
            Divergent — spread &gt; 25pp
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300 normal-case tracking-normal">
            Aligned
          </span>
        )}
      </div>
      <div className="flex h-3 w-full rounded overflow-hidden border border-slate-800">
        {rows.map((r) => (
          <div
            key={r.cause}
            className="h-full"
            style={{
              width: `${(r.mean / total) * 100}%`,
              backgroundColor: CAUSE_COLORS[r.cause] ?? '#64748b',
            }}
            title={`${r.cause} · mean ${(r.mean * 100).toFixed(0)}% · spread ${(r.spread * 100).toFixed(0)}pp · ${r.n} persona(s)`}
          />
        ))}
      </div>
      {top && (
        <p className="mt-1.5 text-xs text-slate-400">
          Top cause: <span className="font-medium" style={{ color: CAUSE_COLORS[top.cause] ?? '#cbd5e1' }}>{top.cause}</span>
          <span className="text-slate-500"> · {(top.mean * 100).toFixed(0)}% mean share across {top.n} persona{top.n === 1 ? '' : 's'}</span>
        </p>
      )}
    </section>
  );
}
