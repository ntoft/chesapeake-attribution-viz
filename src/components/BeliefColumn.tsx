import { useState } from 'react';
import type { AttributionBelief, EvidenceDetail, FishKillEvent, Persona, SatelliteScene } from '../types';
import { CAUSE_COLORS, PERSONA_COLORS } from '../colors';
import { BDUMeter } from './BDUMeter';
import { EvidenceChips } from './EvidenceChips';
import { DetailsModal } from './DetailsModal';

interface Props {
  persona: Persona;
  event: FishKillEvent;
  beliefs: AttributionBelief[];
  evidence?: Record<string, EvidenceDetail>;
  satelliteScenes?: SatelliteScene[];
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

const PERSONA_SURFACE: Record<Persona, { bg: string; headerBg: string; ring: string }> = {
  ngo: {
    bg: 'linear-gradient(180deg, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.02) 60%, transparent 100%)',
    headerBg: 'rgba(16,185,129,0.12)',
    ring: 'rgba(16,185,129,0.35)',
  },
  industry: {
    bg: 'linear-gradient(180deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.02) 60%, transparent 100%)',
    headerBg: 'rgba(245,158,11,0.12)',
    ring: 'rgba(245,158,11,0.35)',
  },
  agency: {
    bg: 'linear-gradient(180deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.02) 60%, transparent 100%)',
    headerBg: 'rgba(59,130,246,0.12)',
    ring: 'rgba(59,130,246,0.35)',
  },
};

export function BeliefColumn({ persona, event, beliefs, evidence, satelliteScenes }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sorted = [...beliefs].sort((a, b) => b.data.share - a.data.share);
  const accent = PERSONA_COLORS[persona];
  const surface = PERSONA_SURFACE[persona];
  const initial = PERSONA_LABEL[persona].charAt(0);

  return (
    <div
      className="relative flex flex-col rounded-lg overflow-hidden shadow-sm"
      style={{
        background: `${surface.bg}, rgb(15, 23, 42)`,
        boxShadow: `inset 0 0 0 1px ${surface.ring}`,
      }}
    >
      {/* Left accent bar — strong persona identifier */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1.5"
        style={{ background: accent }}
      />
      <header
        className="pl-5 pr-4 py-3 border-b border-slate-800/80 flex items-center gap-3"
        style={{ background: surface.headerBg }}
      >
        <div
          className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-950"
          style={{ background: accent }}
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-wide" style={{ color: accent }}>
            {PERSONA_LABEL[persona]}
          </h3>
          <p className="text-[11px] text-slate-400 leading-tight truncate">{PERSONA_BLURB[persona]}</p>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="flex-none text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          aria-label={`Show details for ${PERSONA_LABEL[persona]} attribution`}
        >
          Details
        </button>
      </header>
      <div className="pl-5 pr-4 py-4 space-y-4">
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
            <BDUMeter
              belief={b.data.sl_belief}
              disbelief={b.data.sl_disbelief}
              uncertainty={b.data.sl_uncertainty}
              size="sm"
              showValues
            />
            <p className="text-xs text-slate-400 leading-relaxed pt-1">{b.data.rationale}</p>
            <EvidenceChips ids={b.data.evidence_ids ?? []} evidence={evidence} />
          </div>
        ))}
      </div>
      <DetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        persona={persona}
        event={event}
        beliefs={beliefs}
        evidence={evidence}
        satelliteScenes={satelliteScenes}
      />
    </div>
  );
}
