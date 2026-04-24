import { useEffect, useState } from 'react';
import type { AttributionBelief, EvidenceDetail, FishKillEvent, Persona, SatelliteScene } from '../types';
import { PERSONA_COLORS } from '../colors';

const TRANSITION_MS = 180;

interface Props {
  open: boolean;
  onClose: () => void;
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

const PERSONA_LENS: Record<Persona, string> = {
  ngo: 'An environmental-advocacy lens. Gives stronger prior weight to pollution, runoff, and upstream industrial causes; less patient with "unknown" when any contamination signal exists.',
  industry: 'A regulated-operator lens. Skeptical of pollution attribution — demands strong evidence before linking a fish-kill to an industrial release; more likely to consider natural stressors first.',
  agency: 'A state-regulator lens. Methodical and evidence-driven. When signals are weak or conflicting, reaches for "unknown" rather than over-commit. Balances probabilities.',
};

const SOURCE_REPOS: Record<string, { label: string; description: string; color: string }> = {
  'noaa-sst-daily': {
    label: 'NOAA SST (noaa-sst-daily)',
    description: 'Sea-surface temperature from NOAA ERDDAP / NDBC buoys, ingested hourly. Each Observation is a timestamped station reading (sst_c).',
    color: '#38bdf8',
  },
  'usgs-nwis-daily': {
    label: 'USGS NWIS (usgs-nwis-daily)',
    description: 'Stream gauge, flow, and water-quality observations from USGS National Water Information System, ingested daily.',
    color: '#06b6d4',
  },
  'epa-tri-monthly': {
    label: 'EPA TRI (epa-tri-monthly)',
    description: 'Toxic Release Inventory filings from EPA — facility-level chemical release quantities, ingested monthly.',
    color: '#f43f5e',
  },
  'state-fishkills': {
    label: 'State Reports (state-fishkills)',
    description: 'State agency fish-kill reports (MD-DNR, VA-DEQ). Each record = a witnessed or investigated mortality event.',
    color: '#a855f7',
  },
};

function extractRepo(wref: string): string | null {
  const m = wref.match(/^wh:[^/]+\/([^/]+)\//);
  return m ? m[1] : null;
}

function daysBetween(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return Number.POSITIVE_INFINITY;
  return Math.round(Math.abs(da - db) / (24 * 60 * 60 * 1000));
}

// Find the satellite scene closest in time to the event date, within 3 days.
function nearestScene(
  eventDate: string,
  scenes: SatelliteScene[] | undefined,
): { scene: SatelliteScene; dayDiff: number } | null {
  if (!scenes || scenes.length === 0) return null;
  let best: { scene: SatelliteScene; dayDiff: number } | null = null;
  for (const s of scenes) {
    const d = daysBetween(eventDate, s.data.date);
    if (d > 3) continue;
    if (!best || d < best.dayDiff) best = { scene: s, dayDiff: d };
  }
  return best;
}

export function DetailsModal({ open, onClose, persona, event, beliefs, evidence, satelliteScenes }: Props) {
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRender(true);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    } else {
      setVisible(false);
      const t = setTimeout(() => setRender(false), TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!render) return null;

  const accent = PERSONA_COLORS[persona];
  const allEvidenceIds = Array.from(
    new Set(beliefs.flatMap((b) => b.data.evidence_ids ?? [])),
  );
  const sourcesUsed = new Map<string, string[]>();
  for (const id of allEvidenceIds) {
    const repo = extractRepo(id);
    if (!repo) continue;
    const list = sourcesUsed.get(repo) ?? [];
    list.push(id);
    sourcesUsed.set(repo, list);
  }

  const topCause = beliefs
    .slice()
    .sort((a, b) => b.data.share - a.data.share)[0];

  const nearby = nearestScene(event.data.date, satelliteScenes);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl transition-all ease-out ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-1'}`}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-modal-title"
      >
        <header
          className="sticky top-0 px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur flex items-start justify-between gap-4"
          style={{ boxShadow: `inset 4px 0 0 0 ${accent}` }}
        >
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: accent }}>
              {PERSONA_LABEL[persona]} — behind the attribution
            </p>
            <h2 id="details-modal-title" className="text-lg font-semibold text-slate-100 mt-0.5 truncate">
              {event.data.location_name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {event.data.date}
              {event.data.primary_species && ` · ${event.data.primary_species}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-none text-slate-500 hover:text-slate-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <section className="px-6 py-5 space-y-5 text-sm text-slate-300">
          {/* Event-day satellite snapshot */}
          {nearby && (
            <div className="rounded-md bg-slate-800/40 border border-slate-700 overflow-hidden">
              <div className="flex items-stretch gap-3">
                <div className="flex-none w-32 bg-slate-950 border-r border-slate-700">
                  <img
                    src={nearby.scene.data.preview_png_url}
                    alt={`Satellite SST snapshot — ${nearby.scene.data.date}`}
                    className="block w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex-1 min-w-0 py-2.5 pr-3">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-sky-300">
                    Satellite snapshot
                  </p>
                  <p className="text-xs text-slate-200 mt-0.5">
                    {nearby.scene.data.dataset} · {nearby.scene.data.date}
                    {nearby.dayDiff === 0 ? (
                      <span className="text-slate-500"> · event day</span>
                    ) : (
                      <span className="text-slate-500">
                        {' '}· {nearby.dayDiff}d {Date.parse(nearby.scene.data.date) < Date.parse(event.data.date) ? 'before' : 'after'}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    Region median SST{' '}
                    <span className="text-slate-200 tabular-nums">
                      {nearby.scene.data.median_sst_c.toFixed(1)}°C
                    </span>{' '}
                    · p10 {nearby.scene.data.p10_sst_c.toFixed(1)}°C · p90{' '}
                    {nearby.scene.data.p90_sst_c.toFixed(1)}°C
                  </p>
                  {nearby.scene.data.source_url && (
                    <a
                      href={nearby.scene.data.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-1.5 text-[11px] text-sky-300 hover:text-sky-200 underline underline-offset-2"
                    >
                      View on NOAA CoastWatch →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. Data sources */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">1 · Where this data comes from</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              {PERSONA_LABEL[persona]}'s belief for this event draws on{' '}
              <span className="text-slate-200 font-medium">{allEvidenceIds.length}</span>{' '}
              piece{allEvidenceIds.length === 1 ? '' : 's'} of evidence across{' '}
              <span className="text-slate-200 font-medium">{sourcesUsed.size}</span>{' '}
              upstream source{sourcesUsed.size === 1 ? '' : 's'}. Each source is its own WarmHub
              repo, continuously ingested by a scheduled sprite.
            </p>
            {sourcesUsed.size === 0 && (
              <p className="text-xs text-slate-500 italic">No evidence cited for this belief.</p>
            )}
            <ul className="space-y-2.5">
              {[...sourcesUsed.entries()].map(([repo, ids]) => {
                const meta = SOURCE_REPOS[repo] ?? {
                  label: repo,
                  description: 'Unclassified upstream source.',
                  color: '#64748b',
                };
                const sampleLabels = ids
                  .slice(0, 3)
                  .map((id) => evidence?.[id]?.label ?? id.split('/').slice(-1)[0]);
                return (
                  <li key={repo} className="rounded-md bg-slate-800/50 border border-slate-700 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-none"
                        style={{ background: meta.color }}
                      />
                      <span className="text-xs font-semibold text-slate-200">{meta.label}</span>
                      <span className="text-[10px] text-slate-500 ml-auto tabular-nums">
                        {ids.length} cited
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{meta.description}</p>
                    {sampleLabels.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {sampleLabels.map((s, i) => (
                          <li key={i} className="text-[10px] text-slate-500 font-mono truncate">
                            · {s}
                          </li>
                        ))}
                        {ids.length > sampleLabels.length && (
                          <li className="text-[10px] text-slate-600 italic">
                            + {ids.length - sampleLabels.length} more
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 2. How WarmHub makes sense of it */}
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">2 · How WarmHub makes sense of it</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              WarmHub treats every data point as a typed, versioned <em>Thing</em> in a dedicated repo.
              A cross-repo subscription listens for new FishKillEvents and automatically invokes{' '}
              <span className="text-slate-200 font-mono text-[11px]">attribute-{persona}</span> — a
              sprite that embodies the <span className="text-slate-200">{PERSONA_LABEL[persona]}</span> lens.
            </p>
            <div className="rounded-md bg-slate-800/40 border border-slate-700 p-3 mb-3 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-200 font-medium">{PERSONA_LABEL[persona]}'s lens. </span>
              {PERSONA_LENS[persona]}
            </div>
            <ol className="space-y-2 text-xs leading-relaxed">
              <li className="flex gap-3">
                <span
                  className="flex-none w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950"
                  style={{ background: accent }}
                >
                  1
                </span>
                <span>
                  The event <span className="font-mono text-[10px] text-slate-400">{event.wref}</span>{' '}
                  was added to the attribution repo by state-fishkills ingest.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex-none w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950"
                  style={{ background: accent }}
                >
                  2
                </span>
                <span>
                  The {PERSONA_LABEL[persona]} sprite gathered nearby Observations, Releases, and prior
                  Reports from the upstream repos listed above (filtered to within ~50km and the 14
                  days before the event).
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="flex-none w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950"
                  style={{ background: accent }}
                >
                  3
                </span>
                <span>
                  That context was handed to an LLM running under this persona's system prompt, which
                  returned <span className="text-slate-200 font-medium">{beliefs.length}</span>{' '}
                  cause-level belief{beliefs.length === 1 ? '' : 's'} — each with a{' '}
                  <span className="text-slate-200">Subjective Logic opinion</span> (belief + disbelief
                  + uncertainty = 1).
                </span>
              </li>
              {topCause && (
                <li className="flex gap-3">
                  <span
                    className="flex-none w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950"
                    style={{ background: accent }}
                  >
                    4
                  </span>
                  <span>
                    The top-ranked cause here is{' '}
                    <span className="text-slate-200 font-semibold">{topCause.data.cause}</span> at{' '}
                    <span className="tabular-nums">{(topCause.data.share * 100).toFixed(0)}%</span>{' '}
                    share — reflecting the {PERSONA_LABEL[persona]} prior applied to the evidence
                    actually available for this event.
                  </span>
                </li>
              )}
              <li className="flex gap-3">
                <span
                  className="flex-none w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-950"
                  style={{ background: accent }}
                >
                  5
                </span>
                <span>
                  If upstream sources later <em>revise</em> an Observation cited above (e.g. a QC
                  correction), the <span className="font-mono text-[10px] text-slate-400">correction-reactor</span>{' '}
                  sprite detects it and automatically re-runs this persona's attribution — producing
                  a new version of the belief rather than silently going stale.
                </span>
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
