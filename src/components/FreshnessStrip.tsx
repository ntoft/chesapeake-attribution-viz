import type { PipelineHealth } from '../types';

interface Props {
  health: PipelineHealth | undefined;
}

const STATUS_COLORS = {
  healthy: '#10b981',
  stale: '#f59e0b',
  failing: '#ef4444',
  unknown: '#64748b',
} as const;

function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const deltaMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(deltaMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Per-source freshness cards shown in the top-right of the header.
// Each card is a dot + label + last-commit age. Hover for 24h count.
export function FreshnessStrip({ health }: Props) {
  if (!health) return null;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      {health.sources.map((s) => {
        const color = STATUS_COLORS[s.status];
        return (
          <div
            key={s.repo}
            className="flex items-center gap-1.5"
            title={`${s.label} · ${s.status} · ${s.commitCount24h} commits in last 24h · ${s.failureCount} open failures`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: color, boxShadow: s.status === 'failing' ? `0 0 6px ${color}` : undefined }}
            />
            <span className="text-slate-300 font-medium">{s.label}</span>
            <span className="text-slate-500">{relativeTime(s.lastCommitAt)}</span>
            {s.failureCount > 0 && (
              <span className="px-1 rounded bg-rose-900/40 text-rose-300">
                {s.failureCount}!
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
