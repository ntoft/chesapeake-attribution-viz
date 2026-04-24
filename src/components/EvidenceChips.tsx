import type { EvidenceDetail, EvidenceSource } from '../types';

interface Props {
  ids: string[];
  evidence: Record<string, EvidenceDetail> | undefined;
}

const SOURCE_STYLES: Record<EvidenceSource, { bg: string; fg: string }> = {
  NOAA: { bg: 'bg-sky-900/40', fg: 'text-sky-300' },
  USGS: { bg: 'bg-cyan-900/40', fg: 'text-cyan-300' },
  EPA: { bg: 'bg-rose-900/40', fg: 'text-rose-300' },
  State: { bg: 'bg-violet-900/40', fg: 'text-violet-300' },
  unknown: { bg: 'bg-slate-800/60', fg: 'text-slate-400' },
};

// Renders each evidence wref the persona cited as a colored chip. Unresolved
// wrefs (cross-repo query failed or entry missing from the snapshot) fall
// back to a neutral chip with the shape/name, so the reader can still see
// that a citation was made.
export function EvidenceChips({ ids, evidence }: Props) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-1.5">
      {ids.map((id) => {
        const hit = evidence?.[id];
        const source = hit?.source ?? 'unknown';
        const styles = SOURCE_STYLES[source];
        const label = hit?.label ?? id.replace(/^wh:[^/]+\/[^/]+\//, '');
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${styles.bg} ${styles.fg}`}
            title={id}
          >
            <span className="font-semibold">{source}</span>
            <span className="text-slate-300/80 font-normal">{label.replace(/^[A-Za-z]+ · /, '')}</span>
          </span>
        );
      })}
    </div>
  );
}
