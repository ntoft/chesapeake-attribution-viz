import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PERSONAS = [
  {
    key: 'ngo' as const,
    label: 'NGO',
    blurb: 'Favors pollution and runoff causes.',
    accent: '#10b981',
  },
  {
    key: 'industry' as const,
    label: 'Industry',
    blurb: 'Skeptical of pollution attribution.',
    accent: '#f59e0b',
  },
  {
    key: 'agency' as const,
    label: 'Agency',
    blurb: 'Methodical; defaults to "unknown" under weak evidence.',
    accent: '#3b82f6',
  },
];

const SOURCES = [
  { label: 'NOAA', desc: 'Sea surface temp · weather' },
  { label: 'USGS', desc: 'Streamflow · water chem' },
  { label: 'EPA', desc: 'TRI release inventory' },
  { label: 'State', desc: 'Agency fish-kill reports' },
];

function Arrow() {
  return (
    <div className="text-slate-600 text-xl leading-none my-1.5" aria-hidden>
      ↓
    </div>
  );
}

function Step1() {
  return (
    <div>
      <h2 className="font-serif text-3xl font-medium text-slate-100 leading-tight tracking-tight">
        Three lenses on every fish kill.
      </h2>
      <p className="mt-4 text-sm text-slate-300 leading-relaxed">
        This map plots reported fish-kill events across the U.S. East Coast. For each one, three
        independent AI personas — NGO, Industry, Agency — read the public evidence and form their
        own belief about the cause. You'll see where they agree, where they diverge, and how those
        beliefs shift as new data lands.
      </p>
      <p className="mt-4 text-sm text-slate-300 leading-relaxed">
        Fish kills are early warnings. The same pressures that suffocate fish — low oxygen from
        algal blooms, thermal stress, runoff from farms and storm drains, industrial discharges —
        also reshape food webs, threaten shellfisheries and drinking water, and reveal how
        climate, land use, and industry converge on the same waters. Attributing each incident
        rigorously, and making the disagreement between perspectives visible, turns isolated
        reports into evidence: usable by scientists tracking long-term trends, regulators
        evaluating compliance, and communities asking why their rivers keep changing.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {PERSONAS.map((p) => (
          <div
            key={p.key}
            className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
            style={{ boxShadow: `inset 0 0 0 1px ${p.accent}33` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: p.accent }}
              />
              <span className="text-sm font-semibold text-slate-100">{p.label}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{p.blurb}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-500 leading-relaxed">
        Each persona is a distinct AI agent prompted with its own framing. They look at the same
        evidence and reach independent conclusions — the disagreement itself is information.
      </p>
    </div>
  );
}

function Step2() {
  return (
    <div>
      <h2 className="font-serif text-3xl font-medium text-slate-100 leading-tight tracking-tight">
        Live evidence, continuously analyzed.
      </h2>
      <p className="mt-4 text-sm text-slate-300 leading-relaxed">
        Warmhub ingests public data from federal and state agencies into versioned repositories.
        When a new fish-kill report lands, three persona reactors run in parallel — each weighing
        the evidence through its own lens — and commit a belief. As fresh data arrives, beliefs
        are revised; the timeline scrubber lets you rewind to any past state.
      </p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-6 flex flex-col items-center text-center">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
          Public data sources
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {SOURCES.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 min-w-[130px]"
            >
              <div className="text-xs font-semibold text-slate-100">{s.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
            </div>
          ))}
        </div>

        <Arrow />
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
          Warmhub ingest actions
        </div>
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 max-w-md">
          <div className="text-sm text-slate-100 font-medium">
            Versioned event &amp; evidence repos
          </div>
          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Scheduled fetchers commit each new observation as a versioned thing — every value has
            a provenance and a history.
          </div>
        </div>

        <Arrow />
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
          Persona reactors run in parallel
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {PERSONAS.map((p) => (
            <div
              key={p.key}
              className="rounded-md border px-3 py-2 min-w-[120px]"
              style={{
                borderColor: `${p.accent}55`,
                background: `${p.accent}14`,
              }}
            >
              <div className="flex items-center gap-1.5 justify-center">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: p.accent }}
                />
                <span className="text-xs font-semibold text-slate-100">{p.label}</span>
              </div>
            </div>
          ))}
        </div>

        <Arrow />
        <div className="rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 max-w-md">
          <div className="text-sm text-slate-100 font-medium">
            Versioned attribution beliefs
          </div>
          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Each persona commits one belief per event. Correction reactors revise them as new
            evidence appears — the timeline you scrub is this commit history.
          </div>
        </div>

        <Arrow />
        <div className="rounded-md border border-slate-700 bg-slate-950 px-5 py-2">
          <div className="text-sm text-slate-100 font-medium">This visualization</div>
        </div>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <h2 className="font-serif text-3xl font-medium text-slate-100 leading-tight tracking-tight">
        Rewind, compare, dig in.
      </h2>
      <p className="mt-4 text-sm text-slate-300 leading-relaxed">
        A few things to try as you explore the map and its event panels.
      </p>
      <ul className="mt-6 space-y-4 text-sm text-slate-300">
        <li className="flex gap-3">
          <span className="font-serif text-base text-slate-500 flex-none w-6 text-right">1</span>
          <span>
            <strong className="text-slate-100">Click a marker</strong> to open its event panel.
            Marker color = dominant cause across all personas.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-serif text-base text-slate-500 flex-none w-6 text-right">2</span>
          <span>
            <strong className="text-slate-100">Use the timeline</strong> at the top of the panel
            to rewind beliefs to any past commit. The "rewound" badge appears when you're not at
            HEAD.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-serif text-base text-slate-500 flex-none w-6 text-right">3</span>
          <span>
            <strong className="text-slate-100">Compare share %</strong> between personas.
            Divergent cases (spread &gt; 25 pp) are flagged on the consensus strip.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-serif text-base text-slate-500 flex-none w-6 text-right">4</span>
          <span>
            <strong className="text-slate-100">Tap evidence chips</strong> to see the underlying
            NOAA / USGS / EPA / state observation each persona cited.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-serif text-base text-slate-500 flex-none w-6 text-right">5</span>
          <span>
            <strong className="text-slate-100">Watch the header strip</strong> — green dots mean
            the source ingested in the last 24 hours.
          </span>
        </li>
      </ul>
    </div>
  );
}

const STEPS = [Step1, Step2, Step3];
const STEP_LABELS = ['What you\'re looking at', 'How Warmhub powers it', 'How to read it'];

export function AboutModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const Current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="About this visualization"
    >
      <div
        className="relative w-[min(760px,100%)] max-h-[88vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-lg leading-none flex items-center justify-center border border-slate-700/60"
        >
          ×
        </button>
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">
            Step {step + 1} of {STEPS.length} · {STEP_LABELS[step]}
          </div>
          <Current />
        </div>
        <div className="flex-none flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3 gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={isFirst}
            className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'bg-slate-100 w-6' : 'bg-slate-600 hover:bg-slate-500 w-2'
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
              className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
