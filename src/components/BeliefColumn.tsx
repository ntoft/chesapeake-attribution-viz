import type { AttributionBelief, Persona } from '../types';
import { CAUSE_COLORS, PERSONA_COLORS } from '../colors';

interface Props {
  persona: Persona;
  beliefs: AttributionBelief[];
}

const PERSONA_LABEL: Record<Persona, string> = {
  ngo: 'NGO',
  industry: 'Industry',
  agency: 'Agency',
};

const PERSONA_BLURB: Record<Persona, string> = {
  ngo: 'Favors pollution / runoff causes.',
  industry: 'Skeptical of pollution attribution.',
  agency: 'Methodical, reaches for "unknown" under weak evidence.',
};

export function BeliefColumn({ persona, beliefs }: Props) {
  const sorted = [...beliefs].sort((a, b) => b.data.share - a.data.share);
  const accent = PERSONA_COLORS[persona];

  return (
    <div className="flex flex-col bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
      <header
        className="px-4 py-3 border-b border-slate-700"
        style={{ borderTopColor: accent, borderTopWidth: 3 }}
      >
        <h3 className="text-sm font-semibold tracking-wide uppercase" style={{ color: accent }}>
          {PERSONA_LABEL[persona]}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">{PERSONA_BLURB[persona]}</p>
      </header>
      <div className="p-4 space-y-4">
        {sorted.length === 0 && (
          <p className="text-xs text-slate-500 italic">No beliefs emitted.</p>
        )}
        {sorted.map((b) => (
          <div key={b.wref} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span
                className="px-2 py-0.5 rounded font-medium"
                style={{
                  background: CAUSE_COLORS[b.data.cause] + '33',
                  color: CAUSE_COLORS[b.data.cause],
                }}
              >
                {b.data.cause}
              </span>
              <span className="text-slate-300 tabular-nums">{(b.data.share * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded">
              <div
                className="h-full rounded"
                style={{
                  width: `${b.data.share * 100}%`,
                  background: CAUSE_COLORS[b.data.cause],
                }}
              />
            </div>
            <div className="flex gap-1 text-[10px] text-slate-400 pt-0.5">
              <span title="belief"  className="bg-emerald-900/40 text-emerald-300 px-1 rounded">b {b.data.sl_belief.toFixed(2)}</span>
              <span title="disbelief" className="bg-rose-900/40 text-rose-300 px-1 rounded">d {b.data.sl_disbelief.toFixed(2)}</span>
              <span title="uncertainty" className="bg-amber-900/40 text-amber-300 px-1 rounded">u {b.data.sl_uncertainty.toFixed(2)}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">{b.data.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
